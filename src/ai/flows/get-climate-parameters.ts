'use server';
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GetClimateParametersInputSchema = z.object({
  locationDescription: z.string().describe('A general description of the location, e.g., "Central Valley, California" or "Jharkhand, India".'),
});
export type GetClimateParametersInput = z.infer<typeof GetClimateParametersInputSchema>;

const GetClimateParametersOutputSchema = z.object({
  averageTemperatureC: z.number().describe('Estimated average yearly temperature in Celsius for the location.'),
  averageHumidityPercent: z.number().describe('Estimated average yearly relative humidity percentage for the location.'),
  averageMonthlyRainfallMM: z.number().describe('Estimated average monthly rainfall in millimeters for the location.'),
});
export type GetClimateParametersOutput = z.infer<typeof GetClimateParametersOutputSchema>;

export async function getClimateParameters(input: GetClimateParametersInput): Promise<GetClimateParametersOutput> {
  return getClimateParametersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getClimateParametersPrompt',
  input: {
    schema: z.object({
      locationDescription: z.string().describe('The location description.'),
    }),
  },
  output: {
    schema: z.object({
      averageTemperatureC: z.number().describe('Estimated average yearly temperature in Celsius.'),
      averageHumidityPercent: z.number().describe('Estimated average yearly relative humidity percentage (0-100).'),
      averageMonthlyRainfallMM: z.number().describe('Estimated average monthly rainfall in millimeters.'),
    }),
  },
  prompt: `You are an agricultural climate data provider. Based on the provided location description, estimate the typical average environmental parameters. Provide numerical estimates only.

Location Description: {{{locationDescription}}}

Estimate the following average values for this location:
- averageTemperatureC: Average monthly temperature in Celsius.
- averageHumidityPercent: Average monthly relative humidity percentage (0-100).
- averageMonthlyRainfallMM: Average monthly rainfall in millimeters.

Return only the numerical estimates in the specified JSON format. Ensure humidity is between 0 and 100.
`,
});

const getClimateParametersFlow = ai.defineFlow<
  typeof GetClimateParametersInputSchema,
  typeof GetClimateParametersOutputSchema
>(
  {
    name: 'getClimateParametersFlow',
    inputSchema: GetClimateParametersInputSchema,
    outputSchema: GetClimateParametersOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await prompt(input);

        // Basic validation/clamping for humidity
        if (output && output.averageHumidityPercent) {
            output.averageHumidityPercent = Math.max(0, Math.min(100, output.averageHumidityPercent));
        }
        // Basic validation/clamping for rainfall
        if (output && output.averageMonthlyRainfallMM < 0) {
            output.averageMonthlyRainfallMM = 0;
        }
        // Optional: Add similar validation for temperature if needed

        return output!;
    } catch (error: any) {
        // Log specific rate limit errors for debugging
        if (error.message?.includes("429") || error.details?.includes("429")) {
            console.error(`RATE LIMIT HIT: getClimateParameters for location "${input.locationDescription}". Error details:`, error.details || error.message);
        } else {
            console.error(`Error in getClimateParametersFlow for location "${input.locationDescription}":`, error);
        }
        // Re-throw the error to be handled by the calling component
        throw error;
    }
  }
);
