
import React, { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, Layers, Activity, Droplet, MountainSnow } from 'lucide-react';
import { analyzeImage, AnalysisMode, ImageAnalysisResult } from '../utils/imageProcessing';

interface ImageAnalyzerProps {
  onAnalysisComplete: (coverage: number, soilPercentage: number, rockPercentage: number) => void;
}

export const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('Satellite');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setResult(null); // Reset previous result
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
      try {
        const analysis = analyzeImage(img, mode);
        setResult(analysis);
        onAnalysisComplete(analysis.coverage, analysis.soilPercentage, analysis.rockPercentage);
      } catch (err) {
        console.error(err);
        alert("Error processing image");
      } finally {
        setIsProcessing(false);
      }
    };
  };

  return (
    <div className="bg-gradient-to-br from-cerrado-50 to-white rounded-xl border border-cerrado-200 overflow-hidden mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-cerrado-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg text-green-700">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-cerrado-900 text-sm">Remote Sensing Analysis</h3>
            <p className="text-xs text-cerrado-500">Multispectral extraction & Texture Analysis</p>
          </div>
        </div>
        <span className="text-2xl text-cerrado-300 font-light">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
          
          {!imageSrc ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cerrado-200 rounded-lg p-6 flex flex-col items-center justify-center text-cerrado-400 cursor-pointer hover:border-cerrado-400 hover:bg-cerrado-50 transition-all gap-2"
            >
              <Upload className="w-8 h-8" />
              <span className="text-xs font-medium">Click to upload {mode} image</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-cerrado-200 bg-black/5 h-40">
                <img src={imageSrc} alt="Original" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">Source</span>
              </div>

              {result ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                  
                  {/* Rupestre Specific Alert */}
                  {result.rupestrePrediction && (
                    <div className="bg-stone-100 border-l-4 border-stone-500 p-3 rounded-r-md flex gap-3 items-start">
                       <MountainSnow className="w-5 h-5 text-stone-600 mt-1 shrink-0" />
                       <div>
                          <h4 className="text-sm font-bold text-stone-800">{result.rupestrePrediction.name}</h4>
                          <p className="text-xs text-stone-600">{result.rupestrePrediction.details}</p>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {/* Vegetation */}
                    <div className="space-y-1">
                      <div className="h-20 bg-black rounded overflow-hidden border border-green-200 relative">
                        <img src={result.vegetationMask} className="w-full h-full object-cover opacity-90" />
                        <div className="absolute inset-0 bg-green-500/10"></div>
                      </div>
                      <div className="text-center">
                         <div className="text-[10px] font-bold text-green-700 uppercase">Veg (ExG)</div>
                         <div className="text-sm font-bold text-green-900">{result.coverage}%</div>
                      </div>
                    </div>
                    {/* Soil */}
                    <div className="space-y-1">
                      <div className="h-20 bg-black rounded overflow-hidden border border-orange-200 relative">
                        <img src={result.soilMask} className="w-full h-full object-cover opacity-90" />
                        <div className="absolute inset-0 bg-orange-500/10"></div>
                      </div>
                      <div className="text-center">
                         <div className="text-[10px] font-bold text-orange-700 uppercase">Soil (RI)</div>
                         <div className="text-sm font-bold text-orange-900">{result.soilPercentage}%</div>
                      </div>
                    </div>
                    {/* Rock */}
                    <div className="space-y-1">
                      <div className="h-20 bg-black rounded overflow-hidden border border-slate-200 relative">
                        <img src={result.rockMask} className="w-full h-full object-cover opacity-90" />
                        <div className="absolute inset-0 bg-cyan-500/10"></div>
                      </div>
                      <div className="text-center">
                         <div className="text-[10px] font-bold text-slate-600 uppercase">Rock (NDI)</div>
                         <div className="text-sm font-bold text-slate-800">{result.rockPercentage}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Metrics Table */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                     <div className="bg-white p-2 rounded border border-cerrado-100">
                        <div className="text-cerrado-400 flex items-center gap-1 mb-1"><Activity className="w-3 h-3" /> Texture (Laplacian)</div>
                        <div className="font-mono font-bold text-cerrado-700">{result.textureScore.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">(Var)</span></div>
                     </div>
                     <div className="bg-white p-2 rounded border border-cerrado-100">
                        <div className="text-cerrado-400 flex items-center gap-1 mb-1"><Droplet className="w-3 h-3" /> Avg Saturation</div>
                        <div className="font-mono font-bold text-cerrado-700">{result.avgSaturation} <span className="text-[9px] font-normal text-gray-400">/ 100</span></div>
                     </div>
                     <div className="col-span-2 bg-white p-2 rounded border border-cerrado-100">
                         <div className="text-cerrado-400 mb-1">Detected Soil Type</div>
                         <div className="font-medium text-cerrado-800">{result.soilType}</div>
                     </div>
                  </div>
                  
                </div>
              ) : (
                <button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="w-full py-3 bg-cerrado-600 hover:bg-cerrado-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Layers className="w-4 h-4" /> Run Spectral & Texture Analysis</>}
                </button>
              )}
              
              <button 
                onClick={() => { setImageSrc(null); setResult(null); }}
                className="w-full text-xs text-cerrado-400 hover:text-cerrado-600 underline"
              >
                Clear / Upload New
              </button>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      )}
    </div>
  );
};
