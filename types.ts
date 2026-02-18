export enum BiomeFormation {
  FLORESTAL = 'Florestal',
  SAVANICA = 'Savânica',
  CAMPESTRE = 'Campestre'
}

export interface BiomeParameters {
  coverage: number; // 0-100
  height: number; // meters
  formation: BiomeFormation;
  wetSoil: boolean;
  rocks: boolean;
  soilPercentage: number; // 0-100
}

export interface BiomeResult {
  name: string;
  identified: boolean;
  details?: string;
}

export interface AIAnalysisResult {
  description: string;
  ecology: string;
  flora: string[];
  fauna: string[];
}