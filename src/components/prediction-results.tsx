
import Image from "next/image";
import type { ImproveCropSuggestionsOutput } from "@/ai/flows/improve-crop-suggestions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Info, TrendingUp, BarChart2 } from "lucide-react"; // Added icons
import { AspectRatio } from "@/components/ui/aspect-ratio"; // Import AspectRatio
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"; // Import chart components

interface PredictionResultsProps {
  results: ImproveCropSuggestionsOutput | null;
  error?: string | null;
}

// Helper to determine confidence level based on reasons/actions
const getConfidenceLevel = (reasons: string[], actions: string[]): 'High' | 'Medium' | 'Low' => {
  const reasonCount = reasons.length;
  const actionCount = actions.length;

  if (reasonCount >= 3 && actionCount <= 1) return 'High';
  if (reasonCount >= 2 && actionCount <= 2) return 'Medium';
  // Add a condition for very few reasons/many actions being low
  if (reasonCount < 2 || actionCount >= 3) return 'Low';
  // Default case or intermediate cases
  return 'Medium'; // Defaulting to Medium if not clearly High or Low
}

// Helper to get icon based on confidence
const getConfidenceIcon = (level: 'High' | 'Medium' | 'Low') => {
  switch (level) {
    case 'High': return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'Medium': return <Info className="h-5 w-5 text-yellow-500" />;
    case 'Low': return <AlertTriangle className="h-5 w-5 text-red-500" />;
    default: return null;
  }
}

// Placeholder chart data generation
const generateChartData = (cropName: string) => {
  // Simple hash function to get somewhat consistent numbers based on crop name
  let hash = 0;
  for (let i = 0; i < cropName.length; i++) {
    hash = (hash << 5) - hash + cropName.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const baseYield = 50 + (Math.abs(hash) % 50); // Base yield between 50-100
  const baseProfit = 1000 + (Math.abs(hash) % 1000); // Base profit between 1000-2000

  return [
    { metric: "Est. Yield (units/acre)", value: baseYield + (Math.random() * 20 - 10) }, // Add some randomness
    { metric: "Est. Profit ($/acre)", value: baseProfit + (Math.random() * 500 - 250) },
    { metric: "Water Need (index)", value: 30 + (Math.abs(hash) % 40) }, // 30-70
    { metric: "Nutrient Need (index)", value: 40 + (Math.abs(hash) % 50) }, // 40-90
  ];
};

export function PredictionResults({ results, error }: PredictionResultsProps) {
  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
             <AlertTriangle className="h-5 w-5" /> Error Generating Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
           <p className="mt-2 text-sm text-muted-foreground">Please check your input values, especially if using coordinates, or try again later.</p>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.improvedSuggestions.length === 0) {
    return (
       <Card className="border-dashed border-muted mt-6">
         <CardHeader>
           <CardTitle className="text-muted-foreground">No Predictions Yet</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground">Enter your farm details above and click "Predict Suitable Crops" to see AI-powered suggestions.</p>
         </CardContent>
       </Card>
    );
  }

  return (
    <div className="space-y-6 mt-8"> {/* Increased spacing */}
       <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          AI Crop Suitability Analysis
        </h2>
      {results.improvedSuggestions.map((suggestion, idx) => {
         const confidence = getConfidenceLevel(suggestion.reasons, suggestion.suggestedActions);
         const confidenceIcon = getConfidenceIcon(confidence);
         const chartData = generateChartData(suggestion.crop);

          // Prepare data for simple bar chart (Example: Yield and Profit)
           const barChartData = chartData.filter(d => d.metric.includes("Yield") || d.metric.includes("Profit"))
             .map(d => ({ name: d.metric.split(' ')[1], value: Math.round(d.value) }));


         return (
          <Card key={`${suggestion.crop}-${idx}`} className="shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
             <div className="grid grid-cols-1 md:grid-cols-3">
                {/* Image Section */}
                 <div className="md:col-span-1 p-4 md:border-r">
                    <AspectRatio ratio={4 / 3} className="bg-muted rounded-md overflow-hidden">
                       <Image
                          // Use crop name in seed for varied placeholders
                          src={`https://picsum.photos/seed/${suggestion.crop.toLowerCase().replace(/\s+/g, '-')}/400/300`}
                          alt={`Placeholder image for ${suggestion.crop}`}
                          width={400}
                          height={300}
                          className="object-cover w-full h-full"
                          data-ai-hint={`${suggestion.crop} field plant`} // AI hint for image generation
                       />
                    </AspectRatio>
                     <p className="text-xs text-muted-foreground text-center mt-2">Visual representation of {suggestion.crop} (Placeholder)</p>
                 </div>

                 {/* Details Section */}
                 <div className="md:col-span-2">
                    <CardHeader>
                      <div className="flex justify-between items-start gap-4">
                         <div>
                          <CardTitle className="text-xl">{suggestion.crop}</CardTitle>
                          <CardDescription>Potential suitability analysis based on your data.</CardDescription>
                         </div>
                         <Badge variant={confidence === 'High' ? 'default' : confidence === 'Medium' ? 'secondary' : 'destructive'} className="ml-auto flex items-center gap-1 flex-shrink-0 whitespace-nowrap mt-1">
                           {confidenceIcon}
                           {confidence} Confidence
                         </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4">
                      <div>
                        <h3 className="text-md font-semibold mb-1 flex items-center gap-1"><Info className="h-4 w-4 text-blue-500"/> Reasons for Suggestion:</h3>
                        {suggestion.reasons.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-2">
                            {suggestion.reasons.map((reason, index) => (
                                <li key={`reason-${idx}-${index}`}>{reason}</li>
                            ))}
                            </ul>
                        ): (
                             <p className="text-sm text-muted-foreground italic pl-2">General suitability based on parameters.</p>
                        )}
                      </div>
                      <div>
                        <h3 className="text-md font-semibold mb-1 flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600"/> Suggested Actions to Increase Confidence:</h3>
                         {suggestion.suggestedActions.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-2">
                            {suggestion.suggestedActions.map((action, index) => (
                                <li key={`action-${idx}-${index}`}>{action}</li>
                            ))}
                            </ul>
                         ) : (
                            <p className="text-sm text-muted-foreground italic pl-2">High confidence based on provided data. Consider standard best practices.</p>
                         )}
                      </div>
                    </CardContent>
                    {/* Chart Section - Placed within the details Card for better layout */}
                    <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                         <h3 className="text-md font-semibold flex items-center gap-1"><BarChart2 className="h-4 w-4 text-purple-500"/> Estimated Metrics (Placeholder):</h3>
                         <div className="w-full h-[100px] text-xs"> {/* Reduced height */}
                             <ChartContainer config={{ value: { label: "Value", color: "hsl(var(--primary))" } }} className="h-full w-full">
                                <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}> {/* Adjusted margins */}
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                 <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                 <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                 <ChartTooltip
                                     cursor={false}
                                     content={<ChartTooltipContent hideLabel />}
                                    />
                                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                         </div>
                         <p className="text-xs text-muted-foreground italic w-full text-right">*Illustrative data based on input parameters.</p>
                    </CardFooter>
                 </div>
            </div>
          </Card>
         )
      })}
    </div>
  );
}

