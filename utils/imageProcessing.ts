
/**
 * Converts an RGB color value to HSV.
 * Returns h [0, 360], s [0, 100], v [0, 100].
 */
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, v * 100];
}

/**
 * Converts RGB to CIE L*a*b* (OpenCV 8-bit scaling style).
 * L: 0-255, a: 0-255, b: 0-255
 */
function rgbToLab(red: number, green: number, blue: number): [number, number, number] {
  let R = red / 255, G = green / 255, B = blue / 255;
  
  // Inverse sRGB Companding
  R = (R > 0.04045) ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
  G = (G > 0.04045) ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
  B = (B > 0.04045) ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;

  // RGB to XYZ (D65)
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.00000;
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;

  // XYZ to Lab
  X = (X > 0.008856) ? Math.pow(X, 1/3) : (7.787 * X) + (16 / 116);
  Y = (Y > 0.008856) ? Math.pow(Y, 1/3) : (7.787 * Y) + (16 / 116);
  Z = (Z > 0.008856) ? Math.pow(Z, 1/3) : (7.787 * Z) + (16 / 116);

  const L = (116 * Y) - 16;
  const a = 500 * (X - Y);
  const b = 200 * (Y - Z);

  // Scale to OpenCV 8-bit Lab range
  // L_cv = L * 255/100
  // a_cv = a + 128
  // b_cv = b + 128
  return [L * 2.55, a + 128, b + 128];
}

/**
 * Calculates the variance of the Laplacian (measure of texture/roughness) for the whole image.
 */
function calculateLaplacianVariance(data: Uint8ClampedArray, width: number, height: number): number {
  let sum = 0;
  let sqSum = 0;
  let count = 0;
  const laplacianValues: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const getGray = (i: number) => 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

      const center = getGray(idx);
      const left = getGray(idx - 4);
      const right = getGray(idx + 4);
      const top = getGray(idx - width * 4);
      const bottom = getGray(idx + width * 4);

      const laplacian = left + right + top + bottom - (4 * center);
      
      laplacianValues.push(laplacian);
      sum += laplacian;
      count++;
    }
  }

  const mean = sum / count;
  for (let i = 0; i < count; i++) {
    sqSum += Math.pow(laplacianValues[i] - mean, 2);
  }

  return sqSum / count;
}

/**
 * Computes a pixel-wise Laplacian map (Edge/Roughness strength).
 */
function computeLaplacianMap(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const grayData = new Float32Array(width * height);
  // Grayscale conversion
  for (let i = 0; i < data.length; i += 4) {
    grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const map = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      // Kernel [0 1 0; 1 -4 1; 0 1 0]
      const center = grayData[i];
      const top = grayData[i - width];
      const bottom = grayData[i + width];
      const left = grayData[i - 1];
      const right = grayData[i + 1];
      
      map[i] = Math.abs(top + bottom + left + right - 4 * center);
    }
  }
  return map;
}

export type AnalysisMode = 'Satellite' | 'Smartphone';

export interface ImageAnalysisResult {
  coverage: number;       // Vegetation %
  soilPercentage: number; // Exposed Soil %
  rockPercentage: number; // Rock/Outcrop %
  vegetationMask: string;
  soilMask: string;
  rockMask: string;
  
  // Advanced Rupestre Metrics
  textureScore: number;   // Laplacian Variance
  avgSaturation: number;  // 0-100
  soilType: string;       // "Mineral/Quartzítico" vs "Ferruginoso/Latossolo"
  rupestrePrediction: {   // Specific Classification if applicable
    name: string;
    details: string;
  } | null;
}

export const analyzeImage = (
  imageElement: HTMLImageElement,
  mode: AnalysisMode
): ImageAnalysisResult => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Could not get canvas context");

  const width = imageElement.naturalWidth;
  const height = imageElement.naturalHeight;
  
  // Resize for performance
  const MAX_DIM = 600;
  let scale = 1;
  if (width > MAX_DIM || height > MAX_DIM) {
    scale = Math.min(MAX_DIM / width, MAX_DIM / height);
  }
  
  canvas.width = width * scale;
  canvas.height = height * scale;

  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const totalPixels = canvas.width * canvas.height;

  // Helpers for mask creation
  const createMaskCtx = () => {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    const cx = c.getContext('2d');
    if (!cx) throw new Error("Context creation failed");
    return { c, cx, img: cx.createImageData(canvas.width, canvas.height) };
  };

  const veg = createMaskCtx();
  const soil = createMaskCtx();
  const rock = createMaskCtx();

  let vegCount = 0;
  let soilCount = 0;
  let rockCount = 0;

  let totalR = 0;
  let totalB = 0;
  let totalSat = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    totalR += r;
    totalB += b;

    const R = r / 255.0;
    const G = g / 255.0;
    const B = b / 255.0;

    const exg = 2 * G - R - B;
    const ri = Math.pow(R, 2) / (G * Math.pow(B, 3) + 0.00001);
    const ndiRock = (R + G + B) / 3.0;

    const [h, s, v] = rgbToHsv(r, g, b);
    const saturation = s / 100.0;
    
    totalSat += s;

    let isVeg = false;
    let isSoil = false;
    let isRock = false;

    if (exg > 0.05) {
      isVeg = true;
    } else {
      if (ri > 1.5) {
        isSoil = true;
      }
      if (!isSoil && ndiRock > 0.6 && saturation < 0.3) {
         isRock = true;
      }
    }

    if (mode === 'Smartphone' && isRock) {
       if (h > 180 && h < 260) {
         isRock = false;
       }
    }

    if (isVeg) {
      vegCount++;
      veg.img.data[i] = 0; veg.img.data[i+1] = 255; veg.img.data[i+2] = 0; veg.img.data[i+3] = 255;
    }
    if (isSoil) {
      soilCount++;
      soil.img.data[i] = 255; soil.img.data[i+1] = 80; soil.img.data[i+2] = 0; soil.img.data[i+3] = 255;
    }
    if (isRock) {
      rockCount++;
      rock.img.data[i] = 0; rock.img.data[i+1] = 200; rock.img.data[i+2] = 255; rock.img.data[i+3] = 255;
    }
  }

  veg.cx.putImageData(veg.img, 0, 0);
  soil.cx.putImageData(soil.img, 0, 0);
  rock.cx.putImageData(rock.img, 0, 0);

  const coverage = (vegCount / totalPixels) * 100;
  const soilPercentage = (soilCount / totalPixels) * 100;
  const rockPercentage = (rockCount / totalPixels) * 100;

  const textureScore = calculateLaplacianVariance(data, canvas.width, canvas.height);
  const avgSaturation = totalSat / totalPixels;

  const meanR = totalR / totalPixels;
  const meanB = totalB / totalPixels;
  const diffRB = Math.abs(meanR - meanB);
  
  const soilType = diffRB < 15 
    ? "Mineral/Quartzítico (Campo Rupestre)" 
    : "Ferruginoso/Latossolo (Cerrado Sensu Stricto)";

  let rupestrePrediction = null;

  if (rockPercentage > 30) {
    if (coverage < 5) {
      rupestrePrediction = { name: "Campo Rupestre", details: "Predomínio de herbáceas e arbustos em fendas de rocha." };
    } else if (coverage >= 5 && coverage <= 20) {
      rupestrePrediction = { name: "Cerrado Rupestre", details: "Formação savânica sobre suporte rochoso." };
    }
  }

  if (!rupestrePrediction && textureScore > 500 && avgSaturation < 40 && coverage < 10) {
    rupestrePrediction = { name: "Campo Rupestre (Alta Probabilidade)", details: "Assinatura de solo litólico detetada (Textura rugosa)." };
  }

  return {
    coverage: Math.round(coverage),
    soilPercentage: Math.round(soilPercentage),
    rockPercentage: Math.round(rockPercentage),
    vegetationMask: veg.c.toDataURL(),
    soilMask: soil.c.toDataURL(),
    rockMask: rock.c.toDataURL(),
    textureScore: Math.round(textureScore),
    avgSaturation: Math.round(avgSaturation),
    soilType,
    rupestrePrediction
  };
};

export interface RupestreValidationResult {
  name: string;
  rockPercentage: number;
  treePercentage: number;
  color: string;
}

export const validateRupestre = (imageElement: HTMLImageElement): RupestreValidationResult => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");

  const w = imageElement.naturalWidth;
  const h = imageElement.naturalHeight;
  
  const MAX_DIM = 600; 
  let scale = 1;
  if (w > MAX_DIM || h > MAX_DIM) {
    scale = Math.min(MAX_DIM / w, MAX_DIM / h);
  }
  
  canvas.width = w * scale;
  canvas.height = h * scale;
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  // Use shared helper
  const rugosityData = computeLaplacianMap(data, width, height);

  let rockPixels = 0;
  let treePixels = 0;
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const R_norm = r / 255.0;
    const G_norm = g / 255.0;
    const B_norm = b / 255.0;
    const exg = 2 * G_norm - R_norm - B_norm;
    if (exg > 0.05) {
      treePixels++;
    }

    const [L_cv, a_cv, b_cv] = rgbToLab(r, g, b);
    const chromaticity = Math.sqrt(Math.pow(a_cv - 128, 2) + Math.pow(b_cv - 128, 2));
    const rugosity = rugosityData[i];

    if (L_cv > 140 && chromaticity < 15 && rugosity > 10) {
      rockPixels++;
    }
  }

  const rockPercentage = (rockPixels / totalPixels) * 100;
  const treePercentage = (treePixels / totalPixels) * 100;

  let name = "Outras Fitofisionomias";
  let color = "#808080";

  if (rockPercentage > 8) {
     if (treePercentage < 5) {
       name = "Campo Rupestre";
       color = "#A9A9A9";
     } else if (treePercentage >= 5 && treePercentage <= 40) {
       name = "Cerrado Rupestre";
       color = "#8B4513";
     } else {
       name = "Cerrado Rupestre (Denso)";
       color = "#5D4037";
     }
  } else {
    if (treePercentage > 20) {
      name = "Cerrado Típico (Solo Profundo)";
      color = "#32CD32";
    } else {
      name = "Campo Sujo / Limpo";
      color = "#F0E68C";
    }
  }

  return { name, rockPercentage, treePercentage, color };
};

/**
 * Spatial Mapping Feature
 */

export interface SpatialGridCell {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  color: string;
}

export interface SpatialMapResult {
  baseImageUrl: string;
  grid: SpatialGridCell[];
  foundTypes: { name: string; color: string }[];
  gridSize: number;
}

// Logic from 'classificar_final' in Python
// Key Dichotomous Integration based on Ribeiro & Walter
function classifySegmentIntegrated(cobVeg: number, pctMin: number, wet: boolean, manualRock: boolean): { name: string, color: string } {
    const temRocha = pctMin > 7 || manualRock;

    if (temRocha) {
        if (cobVeg < 5) return { name: "Campo Rupestre", color: "#A9A9A9" }; // Cinza
        if (cobVeg <= 40) return { name: "Cerrado Rupestre", color: "#8B4513" }; // Marrom
        return { name: "Mata Seca", color: "#003C00" }; // Assuming forest on rock is Dry Forest
    }

    // Deep Soil Logic
    if (cobVeg > 90) return wet ? { name: "Mata de Galeria", color: "#006400" } : { name: "Mata Seca", color: "#003C00" };
    if (cobVeg > 50) return { name: "Cerradão", color: "#228B22" };
    if (cobVeg > 20) return { name: "Cerrado Típico", color: "#ADFF2F" };
    if (cobVeg > 5) return wet ? { name: "Vereda", color: "#F0E68C" } : { name: "Cerrado Ralo", color: "#F0E68C" };
    
    // Low vegetation
    return wet ? { name: "Campo Úmido", color: "#DAA520" } : { name: "Campo Sujo", color: "#DAA520" };
}

export const analyzeSpatialImage = (
  imageElement: HTMLImageElement,
  gridSize: number,
  wetSoil: boolean,
  rocks: boolean
): SpatialMapResult => {
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("No context");

  const w = imageElement.naturalWidth;
  const h = imageElement.naturalHeight;

  // Limit processing size for performance
  const MAX_DIM = 800;
  let scale = 1;
  if (w > MAX_DIM || h > MAX_DIM) {
    scale = Math.min(MAX_DIM / w, MAX_DIM / h);
  }

  canvas.width = w * scale;
  canvas.height = h * scale;
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  
  const baseImageUrl = canvas.toDataURL();
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Pre-calculate Laplacian map for the whole image to save performance
  const laplacianMap = computeLaplacianMap(data, canvas.width, canvas.height);

  const dx = Math.floor(canvas.width / gridSize);
  const dy = Math.floor(canvas.height / gridSize);

  const foundTypes = new Map<string, string>(); // Name -> Color
  const grid: SpatialGridCell[] = [];

  // Iterate over grid cells
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const startX = j * dx;
      const startY = i * dy;
      
      let vegPixels = 0;
      let mineralPixels = 0;
      let cellPixels = 0;

      // Iterate pixels within the cell
      for (let y = startY; y < startY + dy && y < canvas.height; y++) {
          for (let x = startX; x < startX + dx && x < canvas.width; x++) {
              const idx = (y * canvas.width + x) * 4;
              
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              
              // 1. Vegetation Metric: NGRDI
              // ngrdi = (G - R) / (G + R + 1e-6)
              // Normalizing RGB to 0-1 for index calc usually good, but ratio is same
              const denom = g + r + 0.00001;
              const ngrdi = (g - r) / denom;
              
              // Threshold 0.03
              if (ngrdi > 0.03) {
                  vegPixels++;
              }
              
              // 2. Mineral Metric: IMR (Lab + Laplacian)
              const [L, a_lab, b_lab] = rgbToLab(r, g, b);
              const cromat = Math.sqrt(Math.pow(a_lab - 128, 2) + Math.pow(b_lab - 128, 2));
              const laplacian = laplacianMap[y * canvas.width + x];
              
              // Mask: L > 150 & Cromat < 18 & Laplacian > 15
              if (L > 150 && cromat < 18 && laplacian > 15) {
                  mineralPixels++;
              }
              
              cellPixels++;
          }
      }

      if (cellPixels === 0) continue;

      const cobVeg = (vegPixels / cellPixels) * 100;
      const pctMin = (mineralPixels / cellPixels) * 100;

      // Classification using the Integrated Logic
      const result = classifySegmentIntegrated(cobVeg, pctMin, wetSoil, rocks);
      foundTypes.set(result.name, result.color);
      
      grid.push({
        x: startX, 
        y: startY, 
        w: dx, 
        h: dy,
        name: result.name,
        color: result.color
      });
    }
  }

  return {
    baseImageUrl,
    grid,
    gridSize,
    foundTypes: Array.from(foundTypes.entries()).map(([name, color]) => ({ name, color }))
  };
};

/**
 * Generates the overlay image based on the visible layers.
 */
export const generateSpatialOverlay = async (
    baseImageUrl: string,
    grid: SpatialGridCell[],
    visibleLayers: Set<string>,
    gridSize: number
  ): Promise<string> => {
     return new Promise((resolve) => {
         const img = new Image();
         img.onload = () => {
             const canvas = document.createElement('canvas');
             canvas.width = img.width;
             canvas.height = img.height;
             const ctx = canvas.getContext('2d');
             if(!ctx) {
                 resolve(baseImageUrl);
                 return;
             }
  
             // Draw base
             ctx.drawImage(img, 0, 0);
  
             // Draw cells
             grid.forEach(cell => {
                 if (visibleLayers.has(cell.name)) {
                     ctx.fillStyle = cell.color;
                     ctx.globalAlpha = 0.5;
                     ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
  
                     // Text
                     if (gridSize <= 8) {
                          ctx.globalAlpha = 1.0;
                          ctx.fillStyle = "#ffffff";
                          ctx.shadowColor = "black";
                          ctx.shadowBlur = 4;
                          ctx.font = "bold 10px sans-serif";
                          const shortName = cell.name.split(' ')[0];
                          ctx.fillText(shortName, cell.x + 5, cell.y + 15);
                     }
                 }
             });
  
             // Draw Grid Lines
             const dx = canvas.width / gridSize;
             const dy = canvas.height / gridSize;
  
             ctx.globalAlpha = 1.0;
             ctx.strokeStyle = "rgba(255,255,255,0.3)";
             ctx.lineWidth = 1;
             ctx.beginPath();
             for(let i = 1; i < gridSize; i++) {
                 ctx.moveTo(i * dx, 0);
                 ctx.lineTo(i * dx, canvas.height);
                 ctx.moveTo(0, i * dy);
                 ctx.lineTo(canvas.width, i * dy);
             }
             ctx.stroke();
  
             resolve(canvas.toDataURL());
         };
         img.src = baseImageUrl;
     });
  }
