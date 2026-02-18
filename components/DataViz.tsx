import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';

interface DataVizProps {
  coverage: number;
  height: number;
}

export const DataViz: React.FC<DataVizProps> = ({ coverage, height }) => {
  const data = [{ x: coverage, y: height }];

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-cerrado-100">
      <h4 className="text-xs font-bold text-cerrado-400 uppercase tracking-wider mb-4 text-center">
        Parameter Distribution Map
      </h4>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3ebe0" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Coverage" 
              unit="%" 
              domain={[0, 100]} 
              tick={{ fontSize: 10, fill: '#7a9e6e' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Height" 
              unit="m" 
              domain={[0, 40]} 
              tick={{ fontSize: 10, fill: '#7a9e6e' }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            
            {/* Background Zones Indications */}
            {/* Grassland: 0-5% */}
            <ReferenceArea x1={0} x2={5} y1={0} y2={40} fill="#fef3c7" fillOpacity={0.4} />
            
            {/* Savanna: 5-50% */}
            <ReferenceArea x1={5} x2={50} y1={0} y2={40} fill="#dcfce7" fillOpacity={0.3} />
            
            {/* Forest / Cerradão: 50-100% */}
            <ReferenceArea x1={50} x2={100} y1={0} y2={40} fill="#166534" fillOpacity={0.1} />

            <Scatter name="Current State" data={data} fill="#46663b">
                {/* Custom dot for current position */}
                <circle cx={0} cy={0} r={6} fill="#3a5231" stroke="white" strokeWidth={2} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[10px] text-cerrado-400 mt-2 px-2">
        <span>Grassland (Yellow)</span>
        <span>Savanna (Green)</span>
        <span>Forest (Dark)</span>
      </div>
    </div>
  );
};