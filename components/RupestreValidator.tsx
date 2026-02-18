
import React, { useState, useRef } from 'react';
import { Upload, ShieldCheck, Info } from 'lucide-react';
import { validateRupestre, RupestreValidationResult } from '../utils/imageProcessing';

export const RupestreValidator: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [result, setResult] = useState<RupestreValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const src = event.target.result as string;
          setImageSrc(src);
          
          // Auto-process on load
          const img = new Image();
          img.src = src;
          img.onload = () => {
             const res = validateRupestre(img);
             setResult(res);
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-2xl shadow-xl border border-cerrado-100 overflow-hidden">
        <div className="p-6 border-b border-cerrado-100 bg-gradient-to-r from-stone-50 to-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-stone-100 p-2 rounded-lg text-stone-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-cerrado-800">Precision Filter: High-Accuracy Rupestre</h2>
          </div>
          <p className="text-sm text-cerrado-600">
             Uses CIE L*a*b* Chromaticity and Laplacian Roughness to detect mineral substrates with high scientific accuracy.
          </p>
        </div>

        <div className="p-6">
           {!imageSrc ? (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="border-2 border-dashed border-stone-200 rounded-xl h-48 flex flex-col items-center justify-center text-stone-400 cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition-all gap-2"
             >
               <Upload className="w-8 h-8" />
               <span className="text-sm font-medium">Upload Image for Precision Validation</span>
             </div>
           ) : (
             <div className="grid md:grid-cols-2 gap-8">
                {/* Image Preview */}
                <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm relative group">
                    <img src={imageSrc} alt="Validation" className="w-full h-full object-cover" />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-4 right-4 bg-white/90 text-xs px-3 py-1 rounded-full shadow-md text-stone-700 hover:bg-white"
                    >
                        Change Image
                    </button>
                </div>

                {/* Results Panel */}
                {result && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">Mineral Index (IMR)</span>
                                <span className="text-3xl font-bold text-stone-700">{result.rockPercentage.toFixed(1)}%</span>
                                <span className="block text-[10px] text-stone-400 mt-1">Fracture & Chromaticity</span>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                <span className="text-xs font-bold text-green-400 uppercase tracking-wider block mb-1">Tree Coverage</span>
                                <span className="text-3xl font-bold text-green-700">{result.treePercentage.toFixed(1)}%</span>
                                <span className="block text-[10px] text-green-500 mt-1">ExG Index</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase mb-2">Scientific Classification</h3>
                            <div className="text-2xl font-bold" style={{ color: result.color }}>
                                {result.name}
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <div className="space-y-2 text-sm text-blue-800">
                                <p className="font-semibold">Analysis Details</p>
                                <ul className="list-disc pl-4 space-y-1 opacity-90">
                                    <li>
                                        <strong>Mineral Extraction:</strong> Detected {result.rockPercentage.toFixed(1)}% of pixels with 
                                        High Brightness (L{'>'}140), Low Chromaticity (C{'<'}15), and High Roughness (Edges{'>'}10).
                                    </li>
                                    <li>
                                        {result.rockPercentage > 8 
                                            ? "Substrate confirmed as Rocky/Litholic (> 8% Mineral Index)." 
                                            : "Substrate classified as Deep Soil (< 8% Mineral Index)."}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
             </div>
           )}
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      </div>
    </div>
  );
};
