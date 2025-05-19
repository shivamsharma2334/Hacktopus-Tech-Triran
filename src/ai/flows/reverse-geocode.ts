'use server';
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const ReverseGeocodeInputSchema = z.object({
  latitude: z.number().describe('The latitude coordinate.'),
  longitude: z.number().describe('The longitude coordinate.'),
});
export type ReverseGeocodeInput = z.infer<typeof ReverseGeocodeInputSchema>;

const ReverseGeocodeOutputSchema = z.object({
  locationDescription: z
    .string()
    .describe('A general description of the location based on the coordinates, e.g., "near Sacramento, California, USA". Include city, state/region, and country if possible.'),
});
export type ReverseGeocodeOutput = z.infer<typeof ReverseGeocodeOutputSchema>;

export async function reverseGeocode(input: ReverseGeocodeInput): Promise<ReverseGeocodeOutput> {
  return reverseGeocodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reverseGeocodePrompt',
  input: {
    schema: z.object({
      latitude: z.number().describe('The latitude.'),
      longitude: z.number().describe('The longitude.'),
    }),
  },
  output: {
    schema: z.object({
      locationDescription: z
        .string()
        .describe('A general description of the location, including city, state/region, and country.'),
    }),
  },
  prompt: `Based on the provided latitude and longitude coordinates, describe the general location. Include the city, state/region, and country if possible. Be concise.

Latitude: {{{latitude}}}
Longitude: {{{longitude}}}
`,
});

const reverseGeocodeFlow = ai.defineFlow<
  typeof ReverseGeocodeInputSchema,
  typeof ReverseGeocodeOutputSchema
>(
  {
    name: 'reverseGeocodeFlow',
    inputSchema: ReverseGeocodeInputSchema,
    outputSchema: ReverseGeocodeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

// FORWARD GEOCODING: Location name to coordinates
export interface GeocodeInput {
  location: string;
}
export interface GeocodeOutput {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Uses OpenStreetMap Nominatim API to geocode a location name to coordinates.
 */
export async function geocode(input: GeocodeInput): Promise<GeocodeOutput | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input.location)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CropPredictionApp/1.0 (your@email.com)',
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const best = data[0];
  return {
    latitude: parseFloat(best.lat),
    longitude: parseFloat(best.lon),
    displayName: best.display_name,
  };
}
