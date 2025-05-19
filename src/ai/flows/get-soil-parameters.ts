'use server';
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GetSoilParametersInputSchema = z.object({
  locationDescription: z.string().describe('A general description of the location, e.g., "Central Valley, California" or "Coastal region, Florida".'),
});
export type GetSoilParametersInput = z.infer<typeof GetSoilParametersInputSchema>;

const GetSoilParametersOutputSchema = z.object({
  nitrogen_kg_ha: z.number().describe('Estimated typical soil Nitrogen (N) content in kg per hectare for the location.'),
  phosphorus_kg_ha: z.number().describe('Estimated typical soil Phosphorus (P) content in kg per hectare for the location.'),
  potassium_kg_ha: z.number().describe('Estimated typical soil Potassium (K) content in kg per hectare for the location.'),
  ph: z.number().describe('Estimated typical soil pH value for the location.'),
});
export type GetSoilParametersOutput = z.infer<typeof GetSoilParametersOutputSchema>;

export async function getSoilParameters(input: GetSoilParametersInput): Promise<GetSoilParametersOutput> {
  return getSoilParametersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getSoilParametersPrompt',
  input: {
    schema: z.object({
      locationDescription: z.string().describe('The location description.'),
    }),
  },
  output: {
    schema: z.object({
      nitrogen_kg_ha: z.number().describe('Estimated typical Nitrogen (N) in kg/ha.'),
      phosphorus_kg_ha: z.number().describe('Estimated typical Phosphorus (P) in kg/ha.'),
      potassium_kg_ha: z.number().describe('Estimated typical Potassium (K) in kg/ha.'),
      ph: z.number().describe('Estimated typical soil pH (e.g., 6.5).'),
    }),
  },
  prompt: `You are an agricultural soil data provider. Based on the provided location description, estimate the typical average soil parameters. Provide numerical estimates only.

Location Description: {{{locationDescription}}}

Estimate the following average soil values for this location:
- nitrogen_kg_ha: Typical Nitrogen (N) content in kilograms per hectare (kg/ha).
- phosphorus_kg_ha: Typical Phosphorus (P) content in kilograms per hectare (kg/ha).
- potassium_kg_ha: Typical Potassium (K) content in kilograms per hectare (kg/ha).
- ph: Typical soil pH value (e.g., between 4.0 and 9.0).

Return only the numerical estimates in the specified JSON format. Ensure pH is within a reasonable range (e.g., 3.5 to 10.0). Provide plausible values based on general knowledge of the location type.
`,
});

const getSoilParametersFlow = ai.defineFlow<
  typeof GetSoilParametersInputSchema,
  typeof GetSoilParametersOutputSchema
>(
  {
    name: 'getSoilParametersFlow',
    inputSchema: GetSoilParametersInputSchema,
    outputSchema: GetSoilParametersOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await prompt(input);

        // Basic validation/clamping for pH
        if (output && output.ph) {
            output.ph = Math.max(3.5, Math.min(10.0, output.ph)); // Clamp pH between 3.5 and 10.0
        }
        // Basic validation for nutrients (ensure non-negative)
        if (output && output.nitrogen_kg_ha < 0) output.nitrogen_kg_ha = 0;
        if (output && output.phosphorus_kg_ha < 0) output.phosphorus_kg_ha = 0;
        if (output && output.potassium_kg_ha < 0) output.potassium_kg_ha = 0;


        return output!;
    } catch (error: any) {
        if (error.message?.includes("429") || error.details?.includes("429")) {
            console.error(`RATE LIMIT HIT: getSoilParameters for location "${input.locationDescription}". Error details:`, error.details || error.message);
        } else {
            console.error(`Error in getSoilParametersFlow for location "${input.locationDescription}":`, error);
        }
        throw error; // Re-throw to be handled by the calling component
    }
  }
);
