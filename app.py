import streamlit as st
import cv2
import numpy as np
from PIL import Image

# --- PAGE CONFIG ---
st.set_page_config(
    page_title="ArarasView - Biome Identifier",
    page_icon="🦜",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CSS STYLING ---
st.markdown("""
    <style>
        .main {
            background-color: #f4f7f2;
        }
        h1, h2, h3 {
            color: #283623;
            font-family: 'Helvetica', sans-serif;
        }
        .stButton>button {
            background-color: #5a804d;
            color: white;
            border-radius: 8px;
            border: none;
        }
        .stButton>button:hover {
            background-color: #46663b;
        }
        div[data-testid="stMetricValue"] {
            font-size: 24px;
            color: #304229;
        }
    </style>
""", unsafe_allow_html=True)

# --- COLOR MAP (RGB) ---
COLOR_MAP = {
    # Forest Formations
    "Mata de Galeria": (0, 100, 0),       # DarkGreen
    "Mata Ciliar": (34, 139, 34),         # ForestGreen
    "Mata Seca": (85, 107, 47),           # DarkOliveGreen
    "Cerradão": (0, 128, 0),              # Green

    # Savanna Formations
    "Cerrado Denso": (50, 205, 50),       # LimeGreen
    "Cerrado Típico": (173, 255, 47),     # GreenYellow
    "Cerrado Ralo": (240, 230, 140),      # Khaki
    "Cerrado Rupestre": (160, 82, 45),    # Sienna (Brownish)
    "Vereda": (0, 255, 255),              # Cyan

    # Grassland Formations
    "Campo Sujo": (218, 165, 32),         # GoldenRod
    "Campo Limpo": (255, 255, 0),         # Yellow
    "Campo Úmido": (70, 130, 180),        # SteelBlue
    "Campo Rupestre": (119, 136, 153)     # LightSlateGray
}

def calculate_ngrdi(img_rgb):
    """
    Calculates Normalized Green Red Difference Index (NGRDI).
    NGRDI = (G - R) / (G + R)
    Returns: Binary mask where True represents vegetation (photosynthetic activity).
    """
    img_float = img_rgb.astype(float)
    r = img_float[:, :, 0]
    g = img_float[:, :, 1]
    
    # Avoid division by zero
    denominator = g + r + 1e-6
    ngrdi = (g - r) / denominator
    
    # Threshold > 0.03 is commonly used for RGB imagery to detect vegetation
    return ngrdi > 0.03

def calculate_mineral_indices(img_rgb):
    """
    Detects mineral substrates using CIE Lab color space and Laplacian texture analysis.
    Returns: Binary mask where True represents exposed rock/mineral substrate.
    """
    # 1. Texture/Roughness using Laplacian
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    # High absolute Laplacian values indicate edges/roughness
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_abs = np.absolute(laplacian)
    
    # 2. Color Properties using CIE Lab
    # L = Lightness, a = Green-Red, b = Blue-Yellow
    lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    
    # Calculate Chromaticity (Saturation distance from center gray)
    # OpenCV 'a' and 'b' ranges are 0-255, with 128 being neutral gray
    a_shifted = a_chan.astype(float) - 128
    b_shifted = b_chan.astype(float) - 128
    chromaticity = np.sqrt(a_shifted**2 + b_shifted**2)
    
    # Rupestre Criteria:
    # - High Brightness (L > 140) implies exposed rock/light soil
    # - Low Chromaticity (C < 18) implies grey/neutral color (not vibrant green or red soil)
    # - High Roughness (Laplacian > 15) implies texture (fractures/rocks), distinguishing from smooth sand/soil
    rock_mask = (l_chan > 140) & (chromaticity < 18) & (laplacian_abs > 15)
    
    return rock_mask

def classify_biome(veg_pct, rock_pct, wet_soil, force_rock):
    """
    Classifies the fitofisionomia based on Ribeiro & Walter (2008) criteria.
    """
    has_rock = (rock_pct > 8.0) or force_rock

    # 1. Forest Formations (> 80% coverage in the quadrant)
    if veg_pct > 80:
        if wet_soil:
            return "Mata de Galeria"
        else:
            return "Mata Seca"

    # 2. Cerradão (Forest-Savanna Transition)
    elif veg_pct >= 50:
        return "Cerradão"

    # 3. Savanna Formations (5% to 50%)
    elif veg_pct >= 5:
        if has_rock:
            return "Cerrado Rupestre"
        if wet_soil:
            return "Vereda"
        
        if veg_pct > 40:
            return "Cerrado Denso"
        elif veg_pct >= 20:
            return "Cerrado Típico"
        else:
            return "Cerrado Ralo"

    # 4. Grassland Formations (< 5%)
    else:
        if has_rock:
            return "Campo Rupestre"
        if wet_soil:
            return "Campo Úmido"
        
        if veg_pct > 1.0:
            return "Campo Sujo"
        else:
            return "Campo Limpo"

def process_image(image_file, grid_size, wet_soil, manual_rocks):
    """
    Main processing pipeline.
    """
    # Load and decode image
    file_bytes = np.asarray(bytearray(image_file.read()), dtype=np.uint8)
    img_bgr = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    
    h, w, _ = img_rgb.shape
    
    # Pre-calculate global masks for efficiency (Vectorized operations)
    veg_mask = calculate_ngrdi(img_rgb)
    rock_mask = calculate_mineral_indices(img_rgb)
    
    # Grid Setup
    step_y = h // grid_size
    step_x = w // grid_size
    
    overlay = img_rgb.copy()
    stats = {}
    
    # Iterate through grid
    for y in range(0, h, step_y):
        for x in range(0, w, step_x):
            # Define Quadrant ROI
            y_end = min(y + step_y, h)
            x_end = min(x + step_x, w)
            
            roi_veg = veg_mask[y:y_end, x:x_end]
            roi_rock = rock_mask[y:y_end, x:x_end]
            
            total_pixels = roi_veg.size
            if total_pixels == 0: continue
            
            # Calculate percentages for this quadrant
            veg_pct = (np.count_nonzero(roi_veg) / total_pixels) * 100
            rock_pct = (np.count_nonzero(roi_rock) / total_pixels) * 100
            
            # Classify
            biome_name = classify_biome(veg_pct, rock_pct, wet_soil, manual_rocks)
            
            # Update stats
            stats[biome_name] = stats.get(biome_name, 0) + 1
            
            # Visualization
            color = COLOR_MAP.get(biome_name, (100, 100, 100))
            
            # Paint quadrant on overlay
            cv2.rectangle(overlay, (x, y), (x_end, y_end), color, -1)
            # Draw light grid border
            cv2.rectangle(overlay, (x, y), (x_end, y_end), (255, 255, 255), 1)

    # Blend overlay with original image (40% opacity for colors)
    final_img = cv2.addWeighted(overlay, 0.4, img_rgb, 0.6, 0)
    
    # Calculate global coverage for metrics
    global_veg = (np.count_nonzero(veg_mask) / veg_mask.size) * 100
    global_rock = (np.count_nonzero(rock_mask) / rock_mask.size) * 100
    
    return final_img, stats, global_veg, global_rock

# --- SIDEBAR UI ---
st.sidebar.title("🦜 ArarasView")
st.sidebar.info("Cerrado Biome Identifier")

st.sidebar.header("Environmental Variables")
wet_soil = st.sidebar.checkbox("Wet Soil / Riparian (Solo Úmido)", help="Activates logic for Mata de Galeria, Vereda, and Campo Úmido.")
manual_rocks = st.sidebar.checkbox("Force Rupestre (Rocha Manual)", help="Overrides automatic mineral detection for known rocky outcrops.")

st.sidebar.header("Grid Settings")
grid_size = st.sidebar.slider("Grid Resolution", min_value=10, max_value=50, value=25, step=5)

# --- MAIN UI ---
st.title("Phytophysiognomy Identification Map")
st.markdown("Upload a drone or satellite image to identify the 12 Biome types of the Brazilian Cerrado based on Ribeiro & Walter (2008).")

uploaded_file = st.file_uploader("Upload Image", type=['jpg', 'jpeg', 'png', 'webp'])

if uploaded_file is not None:
    # Process
    with st.spinner("Processing spectral indices and texture..."):
        result_image, classification_stats, g_veg, g_rock = process_image(uploaded_file, grid_size, wet_soil, manual_rocks)
    
    # Layout Results
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Classified Map")
        st.image(result_image, use_container_width=True)
    
    with col2:
        st.subheader("Global Metrics")
        m1, m2 = st.columns(2)
        m1.metric("Vegetation (NGRDI)", f"{g_veg:.1f}%")
        m2.metric("Mineral (Rupestre)", f"{g_rock:.1f}%")
        
        st.subheader("Distribution")
        # Sort stats by count
        sorted_stats = sorted(classification_stats.items(), key=lambda x: x[1], reverse=True)
        
        for name, count in sorted_stats:
            color = COLOR_MAP.get(name, (0,0,0))
            hex_color = '#%02x%02x%02x' % color
            st.markdown(
                f"""
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="width: 20px; height: 20px; background-color: {hex_color}; margin-right: 10px; border-radius: 4px;"></div>
                    <div style="font-size: 14px;"><b>{name}</b>: {count} blocks</div>
                </div>
                """, 
                unsafe_allow_html=True
            )

else:
    st.info("👆 Please upload an image to start the analysis.")
    st.markdown("""
    ### Scientific Criteria
    
    **1. Forest Formations** (Canopy > 80%)
    *   *Mata de Galeria*: Associated with wet soil/rivers.
    *   *Mata Seca*: Deciduous forests away from water.
    *   *Cerradão*: Transitional forest (50-80%).
    
    **2. Savanna Formations** (5-50%)
    *   *Cerrado Denso*: > 40% coverage.
    *   *Cerrado Típico*: 20-40% coverage.
    *   *Cerrado Ralo*: 5-20% coverage.
    *   *Cerrado Rupestre*: Presence of rocks.
    *   *Vereda*: Wet soil + Palms.
    
    **3. Grassland Formations** (< 5%)
    *   *Campo Sujo*: Shrubs present.
    *   *Campo Limpo*: Pure grassland.
    *   *Campo Rupestre*: Rocky substrate.
    *   *Campo Úmido*: Wet substrate.
    """)
