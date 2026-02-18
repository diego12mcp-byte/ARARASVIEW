import React from 'react';
import { BiomeResult, AIAnalysisResult } from '../types';
import { Sparkles, Leaf, MapPin, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface ResultViewProps {
  result: BiomeResult;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  aiData: AIAnalysisResult | null;
  aiImage: string | null;
}

export const ResultView: React.FC<ResultViewProps> = ({ result, onAnalyze, isAnalyzing, aiData, aiImage }) => {
  
  // Dynamic styling based on Biome Type (Python script logic color mapping)
  const getBiomeStyles = (name: string) => {
    if (!name) return { bg: 'bg-white', text: 'text-cerrado-500', icon: 'text-cerrado-300' };
    
    const n = name.toLowerCase();
    
    if (n.includes('mata seca') || n.includes('dossel fechado')) {
      return { 
        bg: 'bg-green-900', // DarkGreen
        border: 'border-green-800',
        text: 'text-green-50', 
        icon: 'text-green-400',
        accent: 'bg-green-800'
      };
    }
    if (n.includes('galeria') || n.includes('cerradão')) {
      return { 
        bg: 'bg-green-700', // Green
        border: 'border-green-600',
        text: 'text-green-50', 
        icon: 'text-green-300',
        accent: 'bg-green-600'
      };
    }
    if (n.includes('cerrado')) {
      return { 
        bg: 'bg-lime-700', // Olive/Lime tone
        border: 'border-lime-600',
        text: 'text-lime-50', 
        icon: 'text-lime-200',
        accent: 'bg-lime-600'
      };
    }
    return { 
      bg: 'bg-amber-600', // Orange/Savanna/Grassland
      border: 'border-amber-500',
      text: 'text-amber-50', 
      icon: 'text-amber-200',
      accent: 'bg-amber-500'
    };
  };

  const styles = result.identified 
    ? getBiomeStyles(result.name)
    : { bg: 'bg-white', border: 'border-cerrado-200', text: 'text-cerrado-500', icon: 'text-cerrado-300', accent: 'bg-gray-100' };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Logic Result Card */}
      <div className={`rounded-2xl p-8 transition-all duration-500 border-2 shadow-xl ${styles.bg} ${styles.border} ${styles.text}`}>
        <div className="flex justify-between items-start">
          <h3 className="opacity-80 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
            Identified Phytophysiognomy
          </h3>
          {result.identified && (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-widest ${styles.accent} bg-opacity-50`}>
              Verified
            </span>
          )}
        </div>

        <div className="flex items-start gap-4 mt-2">
          <MapPin className={`w-8 h-8 mt-1 shrink-0 ${styles.icon}`} />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              {result.name}
            </h1>
            {result.details && (
              <div className="mt-3 flex items-start gap-2 opacity-90 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                <p>{result.details}</p>
              </div>
            )}
          </div>
        </div>
        
        {result.identified && !aiData && (
          <div className="mt-8">
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center border border-white/10 shadow-lg ${styles.text}`}
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isAnalyzing ? "Consulting Ecologist AI..." : "Ask Gemini Expert"}
            </button>
          </div>
        )}
      </div>

      {/* AI Analysis Result */}
      {aiData && (
        <div className="flex-1 bg-white rounded-2xl shadow-lg border border-cerrado-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Image Section */}
          <div className="h-48 md:h-64 bg-cerrado-100 relative overflow-hidden group">
            {aiImage ? (
              <img 
                src={aiImage} 
                alt={result.name} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-cerrado-400">
                {isAnalyzing ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-12 h-12 opacity-50" />}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
              <span className="text-white text-sm font-medium bg-black/30 backdrop-blur px-3 py-1 rounded-full">
                AI Generated Visualization
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
            <div>
              <h3 className="text-lg font-bold text-cerrado-800 mb-2">Ecological Profile</h3>
              <p className="text-cerrado-600 leading-relaxed">
                {aiData.description}
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <h4 className="text-sm font-bold text-orange-800 uppercase tracking-wide mb-1">Importance & Soil</h4>
              <p className="text-orange-700 text-sm">{aiData.ecology}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-cerrado-800 flex items-center gap-2 mb-3">
                  <Leaf className="w-4 h-4 text-green-600" /> Typical Flora
                </h4>
                <ul className="space-y-2">
                  {aiData.flora.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-cerrado-600 bg-cerrado-50 px-3 py-2 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-cerrado-800 flex items-center gap-2 mb-3">
                  <span className="text-amber-600 text-lg">🐾</span> Typical Fauna
                </h4>
                <ul className="space-y-2">
                  {aiData.fauna.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-cerrado-600 bg-amber-50 px-3 py-2 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};