"use client";

import { useState } from "react";
import type * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CropForm } from "@/components/crop-form";
import { PredictionResults } from "@/components/prediction-results";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateInitialParameters, type GenerateInitialParametersInput, type GenerateInitialParametersOutput } from "@/ai/flows/generate-initial-parameters";
import { improveCropSuggestions, type ImproveCropSuggestionsInput, type ImproveCropSuggestionsOutput } from "@/ai/flows/improve-crop-suggestions";
import { CropFormSchema, type CropFormData } from "@/schemas/crop-form-schema";
import { Leaf, AlertCircle, Loader2, LocateFixed, RefreshCw } from "lucide-react"; // Ensure LocateFixed and RefreshCw are imported


export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [predictionResults, setPredictionResults] = useState<ImproveCropSuggestionsOutput | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<CropFormData>({
    resolver: zodResolver(CropFormSchema),
    defaultValues: {
      location: "",
      desiredCrops: "",
      soilType: "", 
      temperature: 25,
      humidity: 70,
      rainfall: 100,
      
      nitrogen: 50,
      phosphorus: 82,
      potassium: 50,
      ph: 6.60,
      historicalYieldData: "",
      otherParameters: "",
      otherRelevantParameters: "",
    },
  });

  const handleFormSubmit = async (values: CropFormData) => {
    setIsLoading(true);
    setFormError(null);
    setPredictionResults(null);

     if (!values.location || values.location.trim().length < 3) {
         setFormError("Please provide a valid location (at least 3 characters).");
         toast({
           title: "Input Error",
           description: "Location is required.",
           variant: "destructive",
         });
         setIsLoading(false);
         return;
     }

     // Combine all parameters into a single string for the AI (or pass structured if API supports)
     const climateConditionsString = `Avg Temp: ${values.temperature}°C, Avg Humidity: ${values.humidity}%, Avg Rainfall: ${values.rainfall}mm/month`;
     const soilConditionsString = `N: ${values.nitrogen} kg/ha, P: ${values.phosphorus} kg/ha, K: ${values.potassium} kg/ha, pH: ${values.ph.toFixed(2)}, Soil Type: ${values.soilType || 'Not specified'}`;


    try {
      let initialParams: GenerateInitialParametersOutput | null = null;
      // Adjust condition if AI should also fill nutrient values
      const needsInitialParams = !values.soilType || !values.historicalYieldData || !values.otherRelevantParameters;
      let fieldsUpdated = false;

      if (needsInitialParams) {
        const initialParamsInput: GenerateInitialParametersInput = {
          locationDescription: values.location,
          desiredCrops: values.desiredCrops || "common crops for the area",
        };
        toast({
          title: "Estimating Missing Details...",
          description: "Using AI to fill in blanks for general soil type and yield based on location.",
        });
        initialParams = await generateInitialParameters(initialParamsInput);

        if (!values.soilType && initialParams.soilType) {
          form.setValue('soilType', initialParams.soilType, { shouldValidate: true });
          fieldsUpdated = true;
        }
        if (!values.historicalYieldData && initialParams.historicalYieldData) {
           form.setValue('historicalYieldData', initialParams.historicalYieldData, { shouldValidate: true });
           fieldsUpdated = true;
        }
        if (!values.otherRelevantParameters && initialParams.otherRelevantParameters) {
          form.setValue('otherRelevantParameters', initialParams.otherRelevantParameters, { shouldValidate: true });
          fieldsUpdated = true;
       }

        toast({
           title: "Farm Details Estimated",
           description: `AI provided estimates for missing parameters.${fieldsUpdated ? ' Form fields updated.' : ''}`,
           variant: "default",
         });
      }

       // Use form.getValues() to get potentially updated values from AI fills or user edits
       const currentFormValues = form.getValues();
       const currentClimateString = `Avg Temp: ${currentFormValues.temperature}°C, Avg Humidity: ${currentFormValues.humidity}%, Avg Rainfall: ${currentFormValues.rainfall}mm/month`;
       const currentSoilString = `N: ${currentFormValues.nitrogen} kg/ha, P: ${currentFormValues.phosphorus} kg/ha, K: ${currentFormValues.potassium} kg/ha, pH: ${currentFormValues.ph.toFixed(2)}, Soil Type: ${currentFormValues.soilType || initialParams?.soilType || 'Not specified'}`;


       const improveInput: ImproveCropSuggestionsInput = {
         cropSuggestions: currentFormValues.desiredCrops ? currentFormValues.desiredCrops.split(',').map(s => s.trim()).filter(s => s) : [],
         location: currentFormValues.location,
         soilType: currentFormValues.soilType || initialParams?.soilType || "Not Specified", // General soil type
         // Pass both climate and detailed soil strings
         climateConditions: currentClimateString,
         soilConditions: currentSoilString, // Add the new soil conditions string
         historicalYieldData: currentFormValues.historicalYieldData || initialParams?.historicalYieldData || "Not Specified",
         otherRelevantParameters: currentFormValues.otherRelevantParameters || initialParams?.otherRelevantParameters || "Not Specified",
       };


       if (improveInput.cropSuggestions.length === 0) {
            toast({
              title: "Finding Suitable Crops...",
              description: "No specific crops desired, AI will suggest based on location data.",
            });
             improveInput.cropSuggestions = ["suggest based on parameters"];
       } else {
           toast({
                title: "Analyzing Your Choices...",
                description: "Evaluating desired crops and suggesting others.",
              });
       }

      const results = await improveCropSuggestions(improveInput);

       // Filter out placeholder suggestion if present
       results.improvedSuggestions = results.improvedSuggestions.filter(s => s.crop !== "suggest based on parameters");


      setPredictionResults(results);

      if (results.improvedSuggestions.length > 0) {
        toast({
            title: "Analysis Complete!",
            description: "Crop suggestions and insights are ready below.",
            variant: "default",
        });
      } else {
         toast({
              title: "Analysis Complete",
              description: "No specific crop suggestions generated based on the input. Review parameters.",
              variant: "default",
            });
      }

    } catch (err: any) {
      console.error("Prediction process failed:", err);
      const specificError = err.details || err.message || "An unexpected error occurred during AI processing.";
      const userMessage = `Failed to generate predictions. ${specificError.length < 100 ? specificError : 'Please check console for details.'}`;
      setFormError(userMessage);
      toast({
        title: "Prediction Error",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8 lg:max-w-6xl">
       <header className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 border-b pb-4">
          <div className="flex items-center gap-3">
             <Leaf className="h-10 w-10 text-primary" />
             <div>
                <h1 className="text-3xl font-bold text-primary">CropWise</h1>
                <p className="text-muted-foreground">AI-Powered Crop Suitability & Planning</p>
             </div>
          </div>
       </header>

      <div className="grid grid-cols-1 gap-10">
         <Card className="shadow-lg border border-primary/20">
           <CardHeader>
             <CardTitle className="text-2xl">Farm & Location Data</CardTitle>
             <CardDescription>
               Enter details about your farm. Use sliders for environmental and soil parameters. AI can estimate soil type and historical yield if left blank. Use <LocateFixed className="inline h-3 w-3 align-text-bottom"/> for current location and <RefreshCw className="inline h-3 w-3 align-text-bottom"/> to fetch data.
             </CardDescription>
           </CardHeader>
           <CardContent>
            {formError && (
               <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center gap-2 text-sm">
                   <AlertCircle className="h-4 w-4"/>
                   {formError}
               </div>
            )}
            <CropForm form={form} onSubmit={handleFormSubmit} isLoading={isLoading} />
           </CardContent>
         </Card>

         <Separator />

         {isLoading && (
            <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2"/>
                <p className="text-muted-foreground">Analyzing data and generating predictions...</p>
            </div>
         )}

         {!isLoading && (predictionResults || formError) && (
             <PredictionResults results={predictionResults} error={formError} />
         )}

         {!isLoading && !predictionResults && !formError && (
             <Card className="border-dashed border-muted mt-6 bg-background/50">
               <CardHeader>
                 <CardTitle className="text-muted-foreground font-normal">Prediction Area</CardTitle>
               </CardHeader>
               <CardContent className="text-center py-10">
                 <p className="text-muted-foreground">Enter your farm details above and click "Predict Suitable Crops" to get AI-driven insights.</p>
               </CardContent>
             </Card>
         )}


       </div>

       <footer className="mt-16 text-center text-sm text-muted-foreground border-t pt-6">
           Team : Tech Tritan 
       </footer>
    </main>
  );
}
