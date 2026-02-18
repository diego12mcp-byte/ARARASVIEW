
import React, { useState, useRef, useEffect } from 'react';
import { Map as MapIcon, Upload, Image as ImageIcon, Check, Grid, Droplets, Mountain, Eye, EyeOff } from 'lucide-react';
import { analyzeSpatialImage, generateSpatialOverlay, SpatialMapResult } from '../utils/imageProcessing';

export const SpatialMapper: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(20); // Default 20 as per python script request
  const [wetSoil, setWetSoil] = useState(false);
  const [rocks, setRocks] = useState(false); // Acts as 'rocha_manual' / 'rocha_fix'
  
  const [result, setResult] = useState<SpatialMapResult | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setResult(null); 
          setDisplayImage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
        // Short delay to allow UI to render 'Processing' state
        setTimeout(() => {
            try {
                // rocks state acts as the manual override for mineral validation
                const mapResult = analyzeSpatialImage(img, gridSize, wetSoil, rocks);
                setResult(mapResult);
                
                // Init all layers as visible
                const allTypes = new Set(mapResult.foundTypes.map(t => t.name));
                setVisibleLayers(allTypes);
                
                generateSpatialOverlay(mapResult.baseImageUrl, mapResult.grid, allTypes, mapResult.gridSize)
                   .then(setDisplayImage);
                   
            } catch (error) {
                console.error(error);
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };
  };

  // Re-run if context params change and we already have a result
  useEffect(() => {
    if (result && imageSrc) {
        processImage();
    }
  }, [gridSize, wetSoil, rocks]);

  // Handle Layer Toggle Re-draw
  useEffect(() => {
      if (result) {
          generateSpatialOverlay(result.baseImageUrl, result.grid, visibleLayers, result.gridSize)
              .then(setDisplayImage);
      }
  }, [visibleLayers, result]); 

  const toggleLayer = (typeName: string) => {
      setVisibleLayers(prev => {
          const next = new Set(prev);
          if (next.has(typeName)) {
              next.delete(typeName);
          } else {
              next.add(typeName);
          }
          return next;
      });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xl border border-cerrado-100 overflow-hidden">
        <div className="p-6 border-b border-cerrado-100 bg-gradient-to-r from-cerrado-50 to-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <MapIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-cerrado-800">Cerrado Spectral Mapper PRO</h2>
          </div>
          <p className="text-sm text-cerrado-600">
             Integrated Mapping: NGRDI Spectral Indices + High-Precision Mineral Validation (Rupestre).
          </p>
        </div>

        <div className="p-6 grid lg:grid-cols-3 gap-8">
          
          {/* Left: Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Context Controls */}
            <div className="space-y-4">
               <h3 className="text-xs font-bold text-cerrado-400 uppercase tracking-wider">Calibration Parameters</h3>
               <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setWetSoil(!wetSoil)}
                    className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-start gap-3 transition-all ${
                        wetSoil ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-cerrado-200 text-cerrado-500'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${wetSoil ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {wetSoil && <Check className="w-3 h-3 text-white" />}
                    </div>
                    Consider Wet Areas (Veredas/Canais)
                  </button>
                  <button
                    onClick={() => setRocks(!rocks)}
                    className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-start gap-3 transition-all ${
                        rocks ? 'bg-stone-100 border-stone-400 text-stone-700' : 'bg-white border-cerrado-200 text-cerrado-500'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${rocks ? 'bg-stone-600 border-stone-600' : 'border-gray-300'}`}>
                        {rocks && <Check className="w-3 h-3 text-white" />}
                    </div>
                    Force Mineral Validation (Mountain Areas)
                  </button>
               </div>
            </div>

            {/* Grid Size */}
            <div className="space-y-3">
                <div className="flex justify-between">
                    <h3 className="text-xs font-bold text-cerrado-400 uppercase tracking-wider flex items-center gap-2">
                        <Grid className="w-3 h-3" /> Grid Resolution
                    </h3>
                    <span className="text-xs font-bold text-cerrado-700">{gridSize}x{gridSize}</span>
                </div>
                <input
                    type="range"
                    min="8"
                    max="64"
                    step="2"
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="w-full h-2 bg-cerrado-200 rounded-lg appearance-none cursor-pointer accent-cerrado-600"
                />
                <div className="flex justify-between text-[10px] text-cerrado-400">
                   <span>Coarse (8)</span>
                   <span>Fine (64)</span>
                </div>
            </div>

            {/* Upload Area */}
            {!imageSrc ? (
                 <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="border-2 border-dashed border-cerrado-200 rounded-xl h-48 flex flex-col items-center justify-center text-cerrado-400 cursor-pointer hover:border-cerrado-400 hover:bg-cerrado-50 transition-all gap-2"
               >
                 <Upload className="w-8 h-8" />
                 <span className="text-sm font-medium">Upload Satellite/Drone Image</span>
               </div>
            ) : (
                <div className="space-y-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 border border-cerrado-200 text-cerrado-600 text-sm rounded-lg hover:bg-cerrado-50"
                    >
                        Change Image
                    </button>
                    {!result && (
                         <button 
                         onClick={processImage}
                         className="w-full py-3 bg-cerrado-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-cerrado-700 transition-colors"
                     >
                         {isProcessing ? "Processing..." : "Generate Map"}
                     </button>
                    )}
                </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {/* Legend with Toggles */}
            {result && (
                <div className="bg-cerrado-50 p-4 rounded-xl border border-cerrado-100 animate-in slide-in-from-bottom-2">
                    <h4 className="text-xs font-bold text-cerrado-800 mb-3 uppercase flex justify-between items-center">
                        Identified Layers
                        <span className="text-[10px] font-normal text-cerrado-500 normal-case">Toggle visibility</span>
                    </h4>
                    <div className="space-y-2">
                        {result.foundTypes.map((type, idx) => {
                            const isVisible = visibleLayers.has(type.name);
                            return (
                                <div 
                                    key={idx} 
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${isVisible ? 'bg-white shadow-sm border border-cerrado-100' : 'opacity-50 hover:opacity-80'}`}
                                    onClick={() => toggleLayer(type.name)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded shadow-sm border border-black/10" style={{ backgroundColor: type.color }} />
                                        <span className="text-xs font-medium text-cerrado-700">{type.name}</span>
                                    </div>
                                    <button className="text-cerrado-400 hover:text-cerrado-700">
                                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>

          {/* Right: Visualization */}
          <div className="lg:col-span-2 bg-cerrado-100 rounded-xl border border-cerrado-200 flex items-center justify-center relative overflow-hidden min-h-[400px]">
             {displayImage ? (
                 <img src={displayImage} alt="Spatial Analysis" className="max-w-full max-h-[600px] object-contain shadow-lg" />
             ) : imageSrc ? (
                 <img src={imageSrc} alt="Preview" className="max-w-full max-h-[600px] object-contain opacity-50 blur-[1px]" />
             ) : (
                 <div className="text-cerrado-400 flex flex-col items-center gap-2">
                     <ImageIcon className="w-12 h-12 opacity-20" />
                     <span className="text-sm">No image loaded</span>
                 </div>
             )}
             
             {isProcessing && (
                 <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                     <div className="bg-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3">
                         <div className="w-5 h-5 border-2 border-cerrado-600 border-t-transparent rounded-full animate-spin"></div>
                         <div className="flex flex-col">
                            <span className="text-sm font-bold text-cerrado-800">Processing NGRDI & IMR...</span>
                            <span className="text-xs text-cerrado-500">Calculating spectral indices & mineral texture</span>
                         </div>
                     </div>
                 </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};
