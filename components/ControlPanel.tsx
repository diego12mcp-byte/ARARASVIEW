
import React from 'react';
import { BiomeFormation, BiomeParameters } from '../types';
import { Ruler, TreeDeciduous, Info, Droplets, Mountain, Footprints } from 'lucide-react';
import { ImageAnalyzer } from './ImageAnalyzer';

interface ControlPanelProps {
  params: BiomeParameters;
  onChange: (newParams: BiomeParameters) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange }) => {
  
  const handleFormationChange = (f: BiomeFormation) => {
    onChange({ ...params, formation: f });
  };

  const handleSliderChange = (key: keyof BiomeParameters, value: number) => {
    onChange({ ...params, [key]: value });
  };

  const handleToggleChange = (key: keyof BiomeParameters) => {
    onChange({ ...params, [key]: !params[key as keyof BiomeParameters] });
  };

  const handleImageAnalysis = (coverage: number, soilPercentage: number, rockPercentage: number) => {
    // Determine Formation Base
    let formation = params.formation;
    if (coverage >= 50) formation = BiomeFormation.FLORESTAL;
    else if (coverage >= 5) formation = BiomeFormation.SAVANICA;
    else formation = BiomeFormation.CAMPESTRE;

    // Determine Rock Parameter (Threshold: >15% rock coverage implies Rupestre context)
    // Note: The ImageAnalyzer now displays specific Rupestre types, but we still map basic params here
    const rocks = rockPercentage > 15;

    onChange({ 
      ...params, 
      coverage, 
      soilPercentage,
      formation,
      rocks
    });
  };

  return (
    <div className="space-y-6">
      <ImageAnalyzer onAnalysisComplete={handleImageAnalysis} />

      <div className="bg-white rounded-2xl shadow-xl border border-cerrado-100 p-6 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-cerrado-800 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" /> Parameters
          </h2>
          
          {/* Formation Selection */}
          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium text-cerrado-600 uppercase tracking-wider">Major Formation</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(BiomeFormation).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleFormationChange(fmt)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 border ${
                    params.formation === fmt
                      ? 'bg-cerrado-600 text-white border-cerrado-600 shadow-md'
                      : 'bg-cerrado-50 text-cerrado-700 border-cerrado-200 hover:bg-cerrado-100'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            
            {/* Coverage Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-cerrado-700 flex items-center gap-2">
                  <TreeDeciduous className="w-4 h-4" /> Canopy Coverage
                </label>
                <span className="text-2xl font-bold text-cerrado-600">{Math.round(params.coverage)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.coverage}
                onChange={(e) => handleSliderChange('coverage', Number(e.target.value))}
                className="w-full h-2 bg-cerrado-200 rounded-lg appearance-none cursor-pointer accent-cerrado-600"
              />
              <div className="flex justify-between text-xs text-cerrado-400">
                <span>Open (0%)</span>
                <span>Dense (100%)</span>
              </div>
            </div>

            {/* Soil Slider (New) */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-cerrado-700 flex items-center gap-2">
                  <Footprints className="w-4 h-4" /> Soil / Straw
                </label>
                <span className="text-2xl font-bold text-yellow-600">{Math.round(params.soilPercentage)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.soilPercentage}
                onChange={(e) => handleSliderChange('soilPercentage', Number(e.target.value))}
                className="w-full h-2 bg-yellow-100 rounded-lg appearance-none cursor-pointer accent-yellow-600"
              />
            </div>

            {/* Height Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-cerrado-700 flex items-center gap-2">
                  <Ruler className="w-4 h-4" /> Avg. Tree Height
                </label>
                <span className="text-2xl font-bold text-cerrado-600">{params.height}m</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="0.5"
                value={params.height}
                onChange={(e) => handleSliderChange('height', Number(e.target.value))}
                className="w-full h-2 bg-cerrado-200 rounded-lg appearance-none cursor-pointer accent-cerrado-600"
              />
              <div className="flex justify-between text-xs text-cerrado-400">
                <span>Herbaceous (0m)</span>
                <span>Tall Forest (40m)</span>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() => handleToggleChange('wetSoil')}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                params.wetSoil
                  ? 'bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-400'
                  : 'bg-white border-cerrado-200 text-cerrado-500 hover:bg-cerrado-50'
              }`}
            >
              <Droplets className={`w-6 h-6 ${params.wetSoil ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">Wet Soil / River</span>
            </button>

            <button
              onClick={() => handleToggleChange('rocks')}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                params.rocks
                  ? 'bg-stone-100 border-stone-400 text-stone-700 ring-1 ring-stone-400'
                  : 'bg-white border-cerrado-200 text-cerrado-500 hover:bg-cerrado-50'
              }`}
            >
              <Mountain className={`w-6 h-6 ${params.rocks ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">Rocky Terrain</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
