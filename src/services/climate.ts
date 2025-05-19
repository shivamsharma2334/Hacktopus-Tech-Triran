export interface ClimateData {
  avgMonthlyTemperature: number[];
  avgMonthlyRainfall: number[];
  avgMonthlyHumidity: number[];
}
export async function getClimateData(location: string): Promise<ClimateData> {
  return {
    avgMonthlyTemperature: Array(12).fill(25),
    avgMonthlyRainfall: Array(12).fill(100),
    avgMonthlyHumidity: Array(12).fill(75),
  };
}
