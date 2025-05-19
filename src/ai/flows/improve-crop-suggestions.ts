'use server';
import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ImproveCropSuggestionsInputSchema = z.object({
  cropSuggestions: z
    .array(z.string())
    .describe('An array of suggested crops for the given conditions.'),
  location: z.string().describe('The location for which the crop suggestions are made.'),
  soilType: z.string().describe('The general soil type description (e.g., Loam, Clay).'),
  climateConditions: z.string().describe('A string describing the climate conditions (temp, humidity, rainfall).'),
  soilConditions: z.string().describe('A string describing detailed soil parameters (N, P, K, pH).'), // Added detailed soil conditions
  historicalYieldData: z.string().describe('Historical yield data for the location.'),
  otherRelevantParameters: z.string().optional().describe('Other relevant parameters for crop suggestion.'),
});
export type ImproveCropSuggestionsInput = z.infer<
  typeof ImproveCropSuggestionsInputSchema
>;

const ImproveCropSuggestionsOutputSchema = z.object({
  improvedSuggestions: z.array(
    z.object({
      crop: z.string().describe('The suggested crop.'),
      reasons: z.array(z.string()).describe('Reasons for suggesting the crop.'),
      suggestedActions: z
        .array(z.string())
        .describe('Suggested actions to increase confidence in the crop.'),
    })
  ),
});
export type ImproveCropSuggestionsOutput = z.infer<
  typeof ImproveCropSuggestionsOutputSchema
>;

export async function improveCropSuggestions(
  input: ImproveCropSuggestionsInput
): Promise<ImproveCropSuggestionsOutput> {
  return improveCropSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveCropSuggestionsPrompt',
  input: {
    schema: z.object({
      cropSuggestions: z
        .array(z.string())
        .describe('An array of suggested crops for the given conditions. If empty or contains "suggest based on parameters", suggest suitable crops.'),
      location: z.string().describe('The location for which the crop suggestions are made.'),
      soilType: z.string().describe('The general soil type description.'),
      climateConditions: z.string().describe('A string describing the climate conditions.'),
      soilConditions: z.string().describe('A string describing detailed soil parameters (N, P, K, pH).'), // Added soil conditions to input schema
      historicalYieldData: z.string().describe('Historical yield data for the location.'),
      otherRelevantParameters: z.string().optional().describe('Other relevant parameters for crop suggestion.'),
    }),
  },
  output: {
    schema: z.object({
      improvedSuggestions: z.array(
        z.object({
          crop: z.string().describe('The suggested crop.'),
          reasons: z.array(z.string()).describe('Reasons for suggesting the crop based on provided parameters.'),
          suggestedActions: z
            .array(z.string())
            .describe('Concrete, actionable steps to increase confidence or optimize for the crop.'),
        })
      ),
    }),
  },
  prompt: `You are an expert agricultural consultant providing crop recommendations.

Based on the following farm data, analyze the suitability of the desired crops OR suggest the most suitable crops if none are specified. For each suggested crop (either from the user's list or your own suggestions), provide:
1. Specific reasons why the crop is suitable (or unsuitable) considering all provided parameters.
2. Concrete, actionable steps the user can take to increase confidence in this crop's success or to optimize conditions for it (e.g., soil amendments, irrigation adjustments, pest monitoring).

Farm Data:
Location: {{{location}}}
Climate Conditions: {{{climateConditions}}}
Soil Type: {{{soilType}}}
Detailed Soil Parameters: {{{soilConditions}}}
Historical Yield Data: {{{historicalYieldData}}}
Other Relevant Parameters: {{{otherRelevantParameters}}}
Desired Crops: {{#if cropSuggestions}}{{#each cropSuggestions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Suggest based on parameters{{/if}}

If the "Desired Crops" list is empty or contains "suggest based on parameters", identify 3-5 crops best suited for the given conditions and provide the analysis for them. Otherwise, analyze the crops provided in the list.

Format the output as a JSON array of objects, where each object has the following keys:
- crop: The suggested/analyzed crop.
- reasons: An array of strings explaining the suitability based on the data.
- suggestedActions: An array of strings listing actionable steps.
`,
});

const improveCropSuggestionsFlow = ai.defineFlow<
  typeof ImproveCropSuggestionsInputSchema,
  typeof ImproveCropSuggestionsOutputSchema
>(
  {
    name: 'improveCropSuggestionsFlow',
    inputSchema: ImproveCropSuggestionsInputSchema,
    outputSchema: ImproveCropSuggestionsOutputSchema,
  },
  async input => {
    // Handle the case where "suggest based on parameters" is the only item
    if (input.cropSuggestions.length === 1 && input.cropSuggestions[0] === "suggest based on parameters") {
        input.cropSuggestions = []; // Clear the array so the prompt knows to suggest
    }

    const {output} = await prompt(input);
    return output!;
  }
);
