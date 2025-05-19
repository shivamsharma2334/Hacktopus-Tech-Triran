export interface SoilNutrients {
  nitrogen: number;
  phosphorus: number;
potassium: number;
}

export interface SoilProperties {
  texture: string;
  pH: number;
  organicMatter: number;
}

export interface SoilData {
  nutrients: SoilNutrients;
  properties: SoilProperties;
}

export async function getSoilData(location: string): Promise<SoilData> {

  return {
    nutrients: {
      nitrogen: 50,
      phosphorus: 30,
      potassium: 40,
    },
    properties: {
      texture: 'Loam',
      pH: 6.5,
      organicMatter: 3.0,
    },
  };
}
