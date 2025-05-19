'use server';

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Climate conditions are now provided by user, so removed from input
const GenerateInitialParametersInputSchema = z.object({
  locationDescription: z.string().describe('A general description of the location, e.g., "near the coast of California".'),
  desiredCrops: z.string().describe('A comma-separated list of desired crops, e.g., "tomatoes, lettuce, strawberries".'),
});
export type GenerateInitialParametersInput = z.infer<typeof GenerateInitialParametersInputSchema>;

// Climate conditions removed from ou ``tput as well
const GenerateInitialParametersOutputSchema = z.object({
  soilType: z.string().describe('The predicted soil type for the given location.'),
  // climateConditions removed
  historicalYieldData: z.string().describe('An estimate of the historical yield data for the specified crops in the given location.'),
  otherRelevantParameters: z.string().describe('Any other parameters relevant to crop prediction for the specified location and crops.'),
});
export type GenerateInitialParametersOutput = z.infer<typeof GenerateInitialParametersOutputSchema>;

export async function generateInitialParameters(input: GenerateInitialParametersInput): Promise<GenerateInitialParametersOutput> {
  return generateInitialParametersFlow(input);
}

const prompt = ai.definePrompt({
  
  name: 'generateInitialParametersPrompt',
  input: {
    schema: z.object({ // Input schema updated
      locationDescription: z.string().describe('A general description of the location.'),
      desiredCrops: z.string().describe('A comma-separated list of desired crops.'),
    }),
  },
  output: {
    schema: z.object({ // Output schema updated
      soilType: z.string().describe('The predicted soil type for the given location.'),
      // climateConditions removed
      historicalYieldData: z.string().describe('An estimate of the historical yield data for the specified crops in the given location.'),
      otherRelevantParameters: z.string().describe('Any other parameters relevant to crop prediction for the specified location and crops.'),
    }),
  },
  prompt: `You are an expert agricultural consultant. A user is starting a crop planning application and needs initial parameters for their location and desired crops. The user has already provided climate information separately.

  Based on the following information, provide initial parameters that the user can use. Be as specific as possible.

  Location Description: {{{locationDescription}}}
  Desired Crops: {{{desiredCrops}}}

  Output the following parameters:
  - soilType: The predicted soil type for the given location under 100 chaeacters.
  - historicalYieldData: An estimate of the historical yield data (e.g., tons per acre) for the specified crops in the given location under 100 words.
  - otherRelevantParameters: generate Any other parameters that might be relevant to crop prediction, such as pest pressure or market demand in the area under 100 words.
  `,
});

const generateInitialParametersFlow = ai.defineFlow<
  typeof GenerateInitialParametersInputSchema,
  typeof GenerateInitialParametersOutputSchema
>(
  {
    name: 'generateInitialParametersFlow',
    inputSchema: GenerateInitialParametersInputSchema,
    outputSchema: GenerateInitialParametersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
