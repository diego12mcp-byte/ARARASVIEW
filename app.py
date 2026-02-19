import React, { useState, useEffect, useMemo } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ResultView } from './components/ResultView';
import { DataViz } from './components/DataViz';
import { SpatialMapper } from './components/SpatialMapper';
import { RupestreValidator } from './components/RupestreValidator';
import { BiomeParameters, BiomeFormation, BiomeResult, AIAnalysisResult } from './types';
import { identifyFitofisionomia } from './utils/biomeLogic';
import { getBiomeAnalysis, generateBiomeImage } from './services/geminiService';
import { Map as MapIcon, Sliders, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [appMode, setAppMode] = useState<'identification' | 'spatial' | 'rupestre'>('identification');

  const [params, setParams] = useState<BiomeParameters>({
    coverage: 60,
    height: 7,
    formation: BiomeFormation.SAVANICA,
    wetSoil: false,
    rocks: false,
    soilPercentage: 10,
  });

  const [result, setResult] = useState<BiomeResult>({ name: '', identified: false });
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiData, setAiData] = useState<AIAnalysisResult | null>(null);
  const [aiImage, setAiImage] = useState<string | null>(null);

  // --- Logic ---
  
  // Real-time identification logic
  useEffect(() => {
    const newResult = identifyFitofisionomia(
      params.coverage,
      params.height,
      params.formation,
      params.wetSoil,
      params.rocks,
      params.soilPercentage
    );
    setResult(newResult);
    
    // Clear AI data if the biome result name changes significantly (prevent showing wrong data)
    // We check against previous to avoid clearing on minor slider adjustments if result text stays same
    setAiData(prev => {
        // If the main category changed, clear it.
        return null;
    });
    setAiImage(null);
  }, [params]);

  const handleAiAnalyze = async () => {
    if (!result.identified) return;

    setIsAiAnalyzing(true);
    setAiData(null);
    setAiImage(null);

    try {
      // Parallel execution for speed
      const [analysis, imageUrl] = await Promise.all([
        getBiomeAnalysis(result.name),
        generateBiomeImage(result.name)
      ]);

      setAiData(analysis);
      setAiImage(imageUrl);
    } catch (error) {
      console.error("AI Error", error);
      alert("Failed to retrieve AI insights. Please try again.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-cerrado-50 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-cerrado-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 flex items-center justify-center bg-sky-100 rounded-full border-2 border-sky-200 overflow-hidden shadow-sm hover:scale-105 transition-transform">
               {/* Cartoon Macaw SVG */}
               <svg viewBox="0 0 100 100" className="w-full h-full">
                 <circle cx="50" cy="50" r="50" fill="#38bdf8" /> {/* Head Base */}
                 <circle cx="35" cy="42" r="14" fill="white" />   {/* Left Eye Patch */}
                 <circle cx="65" cy="42" r="14" fill="white" />   {/* Right Eye Patch */}
                 
                 <circle cx="35" cy="42" r="5" fill="#0f172a" />  {/* Left Eye */}
                 <circle cx="65" cy="42" r="5" fill="#0f172a" />  {/* Right Eye */}
                 
                 {/* Beak */}
                 <path d="M42 58 Q50 80 58 58 Q50 50 42 58" fill="#1e293b" />
                 
                 {/* Cheeks */}
                 <circle cx="20" cy="60" r="6" fill="#f472b6" opacity="0.4" />
                 <circle cx="80" cy="60" r="6" fill="#f472b6" opacity="0.4" />
                 
                 {/* Tuft of feathers */}
                 <path d="M40 5 L50 15 L60 5 L50 25 Z" fill="#0284c7" />
               </svg>
            </div>
            <h1 className="text-xl font-bold text-cerrado-800 tracking-tight">Araras<span className="text-cerrado-500 font-light">View</span></h1>
          </div>
          
          <div className="flex items-center bg-cerrado-100 p-1 rounded-lg">
             <button 
               onClick={() => setAppMode('identification')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                 appMode === 'identification' 
                   ? 'bg-white text-cerrado-800 shadow-sm' 
                   : 'text-cerrado-500 hover:text-cerrado-700'
               }`}
             >
               <Sliders className="w-3 h-3" /> Identification
             </button>
             <button 
               onClick={() => setAppMode('spatial')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                 appMode === 'spatial' 
                   ? 'bg-white text-cerrado-800 shadow-sm' 
                   : 'text-cerrado-500 hover:text-cerrado-700'
               }`}
             >
               <MapIcon className="w-3 h-3" /> Spatial Map
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {appMode === 'identification' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-in fade-in duration-500">
            {/* Left Column: Controls (4/12) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <ControlPanel params={params} onChange={setParams} />
              
              {/* Visualization Widget */}
              <div className="hidden lg:block">
                <DataViz coverage={params.coverage} height={params.height} />
              </div>
            </div>

            {/* Right Column: Results & AI (8/12) */}
            <div className="lg:col-span-7 xl:col-span-8 min-h-[500px]">
              <ResultView 
                result={result} 
                onAnalyze={handleAiAnalyze}
                isAnalyzing={isAiAnalyzing}
                aiData={aiData}
                aiImage={aiImage}
              />
            </div>

            {/* Mobile Viz Widget */}
            <div className="lg:hidden col-span-1">
              <DataViz coverage={params.coverage} height={params.height} />
            </div>
          </div>
        )}

        {appMode === 'spatial' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SpatialMapper />
          </div>
        )}

        {appMode === 'rupestre' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RupestreValidator />
           </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-cerrado-800 text-cerrado-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} ArarasView. Scientific criteria based on Brazilian Biome Classification.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
