import { BiomeFormation, BiomeResult } from '../types';

/**
 * Identifies the phytophysiognomy based on Cerrado Biome criteria.
 * Aligned with Scientific Classification (12 Fitofisionomias).
 */
export const identifyFitofisionomia = (
  coverage: number,
  height: number,
  formation: BiomeFormation,
  wetSoil: boolean,
  rocks: boolean,
  soilPercentage: number = 0
): BiomeResult => {
  
  let name = "";
  let details = "";

  // Logic derived from scientific classification
  
  // 1. Forest Formations (Formações Florestais) - Coverage > 80%
  if (coverage > 80) {
    if (wetSoil) {
      name = "Mata de Galeria";
      details = "Dossel fechado sobre o rio, sempre-verde. (Closed canopy over river, evergreen).";
    } else {
      // In scientific keys, 'Mata Seca' (Dry Forest) depends on deciduousness/seasonality.
      // Without specific leaf-loss data, we treat non-wet high-coverage as Dry Forest.
      name = "Mata Seca (Floresta Estacional)";
      details = "Dossel fechado, caducifólia parcial ou total. (Deciduous seasonal forest).";
    }
  }
  // 2. Cerradão (Transitional Forest) - 50% <= Coverage <= 80%
  else if (coverage >= 50) {
    name = "Cerradão";
    details = "Aspecto florestal, mas com elementos xeromórficos. (Forest-like with xeromorphic elements).";
  }
  // 3. Savanna Formations (Formações Savânicas) - 5% <= Coverage < 50%
  else if (coverage >= 5) {
    if (rocks) {
      name = "Cerrado Rupestre";
      details = "Vegetação arbórea-arbustiva sobre afloramentos rochosos.";
    } else if (wetSoil) {
      name = "Vereda";
      details = "Presença de Palmeiras (Mauritia flexuosa) e solo hidromórfico.";
    } else if (coverage > 40) {
      name = "Cerrado Denso";
      details = "Árvores baixas, cobertura próxima ao limite florestal.";
    } else if (coverage >= 20) {
      name = "Cerrado Típico";
      details = "Equilíbrio entre árvores e gramíneas (Sensu stricto).";
    } else {
      // 5% to 20%
      name = "Cerrado Ralo";
      details = "Árvores muito esparsas.";
    }
  }
  // 4. Grassland Formations (Formações Campestres) - Coverage < 5%
  else {
    if (rocks) {
      name = "Campo Rupestre";
      details = "Predomínio de herbáceas em solo raso/pedregoso.";
    } else if (wetSoil) {
      name = "Campo Úmido";
      details = "Solo saturado, sem árvores.";
    } else if (coverage > 1) {
      name = "Campo Sujo";
      details = "Gramíneas com arbustos esparsos.";
    } else {
      name = "Campo Limpo";
      details = "Exclusivamente gramíneas.";
    }
  }

  if (name) {
    return { name, identified: true, details };
  }

  return { name: "Fisionomia não identificada. Verifique os parâmetros.", identified: false };
};