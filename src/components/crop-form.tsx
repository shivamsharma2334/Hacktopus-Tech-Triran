"use client";

import * as React from "react";
import Image from "next/image";
import type * as z from "zod";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Loader2, MapPin, Sprout, Thermometer, Droplets, CloudRain, BookOpen, BrainCircuit, LocateFixed, Image as ImageIcon, RefreshCw, Beaker, Atom, Blend } from "lucide-react"; // Added soil icons
import { CropFormSchema, CropFormSchemaRanges, type CropFormData } from "@/schemas/crop-form-schema"; // Import ranges
import { reverseGeocode, type ReverseGeocodeInput, geocode, type GeocodeInput } from "@/ai/flows/reverse-geocode";
import { getClimateParameters, type GetClimateParametersInput, type GetClimateParametersOutput } from "@/ai/flows/get-climate-parameters";
import { getSoilParameters, type GetSoilParametersInput, type GetSoilParametersOutput } from "@/ai/flows/get-soil-parameters"; // Import soil flow
import { useToast } from "@/hooks/use-toast";
import { MapPlaceholder } from "@/components/map-placeholder";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Debounce function
function debounce<F extends (...args: any[]) => void>(func: F, wait: number): F & { cancel?: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = function(this: ThisParameterType<F>, ...args: Parameters<F>) {
    const context = this;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func.apply(context, args);
    }, wait);
  } as F;

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return Object.assign(debouncedFn, { cancel });
}


interface CropFormProps {
  form: UseFormReturn<CropFormData>;
  onSubmit: (values: CropFormData) => void;
  isLoading: boolean;
}

export function CropForm({ form, onSubmit, isLoading }: CropFormProps) {
  const [isFetchingLocation, setIsFetchingLocation] = React.useState(false);
  const [isFetchingClimate, setIsFetchingClimate] = React.useState(false);
  const [isFetchingSoil, setIsFetchingSoil] = React.useState(false); // State for soil fetching
  const [currentLatitude, setCurrentLatitude] = React.useState<number | null>(null);
  const [currentLongitude, setCurrentLongitude] = React.useState<number | null>(null);
  const { toast } = useToast();

   // Watch values to update sliders display
   const locationValue = form.watch("location");
   const temperatureValue = form.watch("temperature");
   const humidityValue = form.watch("humidity");
   const rainfallValue = form.watch("rainfall");
   const nitrogenValue = form.watch("nitrogen");
   const phosphorusValue = form.watch("phosphorus");
   const potassiumValue = form.watch("potassium");
   const phValue = form.watch("ph");

  const isFetchingAnyData = isFetchingLocation || isFetchingClimate || isFetchingSoil;

  // fetchAndUpdateClimate function
  const fetchAndUpdateClimate = React.useCallback(async (location: string) => {
    if (!location || location.trim().length < 3 || /Coords:/.test(location) || isFetchingClimate) {
        return;
    }
    setIsFetchingClimate(true);
    toast({
      title: "Fetching Climate Data...",
      description: `Estimating typical conditions for ${location}.`,
    });
    try {
      const climateInput: GetClimateParametersInput = { locationDescription: location };
      const climateResult = await getClimateParameters(climateInput);

      const clampedTemp = Math.max(CropFormSchemaRanges.temperature.min, Math.min(CropFormSchemaRanges.temperature.max, climateResult.averageTemperatureC));
      const clampedHumidity = Math.max(CropFormSchemaRanges.humidity.min, Math.min(CropFormSchemaRanges.humidity.max, climateResult.averageHumidityPercent));
      const clampedRainfall = Math.max(CropFormSchemaRanges.rainfall.min, Math.min(CropFormSchemaRanges.rainfall.max, climateResult.averageMonthlyRainfallMM));

      form.setValue("temperature", clampedTemp, { shouldValidate: true });
      form.setValue("humidity", clampedHumidity, { shouldValidate: true });
      form.setValue("rainfall", clampedRainfall, { shouldValidate: true });

      toast({
        title: "Climate Data Updated",
        description: `Set average temp, humidity, and rainfall for ${location}. Adjust sliders if needed.`,
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error fetching climate data:", error);
       const isRateLimitError = error.message?.includes("429") || error.details?.includes("429");
       const specificError = error.details || error.message || "Could not estimate climate parameters.";
       const userMessage = isRateLimitError
           ? "API rate limit reached. Please wait a minute and try fetching climate data again using the refresh button."
           : specificError.length < 100 ? specificError : "Failed to estimate climate data. Check console.";

      toast({
        title: "Climate Fetch Error",
        description: userMessage,
        variant: isRateLimitError ? "destructive" : "default",
      });
    } finally {
      setIsFetchingClimate(false);
    }
  }, [form, toast, isFetchingClimate]); // Added ranges dep

  // NEW: fetchAndUpdateSoil function
  const fetchAndUpdateSoil = React.useCallback(async (location: string) => {
    if (!location || location.trim().length < 3 || /Coords:/.test(location) || isFetchingSoil) {
      return;
    }
    setIsFetchingSoil(true);
    toast({
      title: "Fetching Soil Data...",
      description: `Estimating typical soil parameters for ${location}.`,
    });
    try {
      const soilInput: GetSoilParametersInput = { locationDescription: location };
      const soilResult = await getSoilParameters(soilInput);

      const clampedNitrogen = Math.max(CropFormSchemaRanges.nitrogen.min, Math.min(CropFormSchemaRanges.nitrogen.max, soilResult.nitrogen_kg_ha));
      const clampedPhosphorus = Math.max(CropFormSchemaRanges.phosphorus.min, Math.min(CropFormSchemaRanges.phosphorus.max, soilResult.phosphorus_kg_ha));
      const clampedPotassium = Math.max(CropFormSchemaRanges.potassium.min, Math.min(CropFormSchemaRanges.potassium.max, soilResult.potassium_kg_ha));
      const clampedPh = Math.max(CropFormSchemaRanges.ph.min, Math.min(CropFormSchemaRanges.ph.max, soilResult.ph));

      form.setValue("nitrogen", clampedNitrogen, { shouldValidate: true });
      form.setValue("phosphorus", clampedPhosphorus, { shouldValidate: true });
      form.setValue("potassium", clampedPotassium, { shouldValidate: true });
      form.setValue("ph", clampedPh, { shouldValidate: true });

      toast({
        title: "Soil Data Updated",
        description: `Set estimated N, P, K, and pH for ${location}. Adjust sliders if needed.`,
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error fetching soil data:", error);
      const isRateLimitError = error.message?.includes("429") || error.details?.includes("429");
      const specificError = error.details || error.message || "Could not estimate soil parameters.";
      const userMessage = isRateLimitError
          ? "API rate limit reached. Please wait a minute and try fetching soil data again using the refresh button."
          : specificError.length < 100 ? specificError : "Failed to estimate soil data. Check console.";

      toast({
        title: "Soil Fetch Error",
        description: userMessage,
        variant: isRateLimitError ? "destructive" : "default",
      });
    } finally {
      setIsFetchingSoil(false);
    }
  }, [form, toast, isFetchingSoil]); // Added ranges dep


  // Debounced versions
  const debouncedFetchAndUpdateClimate = React.useMemo(
    () => debounce(fetchAndUpdateClimate, 2500),
    [fetchAndUpdateClimate]
  );
  const debouncedFetchAndUpdateSoil = React.useMemo(
      () => debounce(fetchAndUpdateSoil, 2500),
      [fetchAndUpdateSoil]
    );


  // handleGetCurrentLocation updated to fetch both climate and soil
  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Error",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    debouncedFetchAndUpdateClimate.cancel?.();
    debouncedFetchAndUpdateSoil.cancel?.(); // Cancel soil debounce too
    setIsFetchingLocation(true);
    setCurrentLatitude(null);
    setCurrentLongitude(null);
    toast({
      title: "Fetching Location...",
      description: "Getting your current coordinates. Please allow location access if prompted.",
    });

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      setCurrentLatitude(latitude);
      setCurrentLongitude(longitude);
      toast({
        title: "Coordinates Found",
        description: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}. Getting location description...`,
      });

      const geoInput: ReverseGeocodeInput = { latitude, longitude };
      const geoResult = await reverseGeocode(geoInput);

      if (geoResult.locationDescription) {
        form.setValue("location", geoResult.locationDescription, { shouldValidate: true });
        toast({
          title: "Location Set!",
          description: `Location automatically set to: ${geoResult.locationDescription}`,
           variant: "default",
        });
        // Trigger both fetches immediately
        await Promise.all([
            fetchAndUpdateClimate(geoResult.locationDescription),
            fetchAndUpdateSoil(geoResult.locationDescription)
        ]);
      } else {
         toast({
           title: "Reverse Geocoding Failed",
           description: "Could not determine location description. Please enter manually.",
           variant: "default",
         });
         form.setValue("location", `Coords: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, { shouldValidate: true });
      }

    } catch (error: any) {
      console.error("Error getting location:", error);
      let description = "An unknown error occurred while fetching your location.";
      if (error.code === error.PERMISSION_DENIED) {
        description = "Permission denied. Please enable location services for this site in your browser settings.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        description = "Location information is unavailable.";
      } else if (error.code === error.TIMEOUT) {
        description = "The request to get user location timed out.";
      } else if (error.message?.includes('reverseGeocode')) {
          description = `Failed to get location description: ${error.message}`;
      } else if (error.message?.includes("429")) {
           description = "API rate limit reached while fetching location description. Please try again later.";
      }

      toast({
        title: "Location Error",
        description: description,
        variant: "destructive",
      });
       setCurrentLatitude(null);
       setCurrentLongitude(null);
    } finally {
      setIsFetchingLocation(false);
    }
  };

   // Effect for geocoding location name to coordinates
   React.useEffect(() => {
     const location = form.getValues("location");
     if (!isFetchingLocation && location && !/Coords:/.test(location)) {
       // Only geocode if not already coordinates and location is not empty
       (async () => {
         const result = await geocode({ location });
         if (result) {
           setCurrentLatitude(result.latitude);
           setCurrentLongitude(result.longitude);
         } else {
           setCurrentLatitude(null);
           setCurrentLongitude(null);
         }
       })();
     } else if (!location) {
       setCurrentLatitude(null);
       setCurrentLongitude(null);
     }
     // If location is Coords:..., do not geocode, let handleGetCurrentLocation handle it
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [locationValue, isFetchingLocation]);


   // Wrapper function to fetch both climate and soil
   const fetchAllDataForLocation = async (location: string) => {
        debouncedFetchAndUpdateClimate.cancel?.();
        debouncedFetchAndUpdateSoil.cancel?.();
        await Promise.all([
            fetchAndUpdateClimate(location),
            fetchAndUpdateSoil(location)
        ]);
   };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* Location & Desired Crops Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Location
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetCurrentLocation}
                      disabled={isFetchingAnyData}
                      className="flex items-center gap-1 text-xs"
                    >
                      {isFetchingLocation ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <LocateFixed className="h-3 w-3 mr-1" />
                          Use Current Location
                        </>
                      )}
                    </Button>
                  </div>
                  <FormControl>
                     <div className="flex gap-1">
                        <Input
                           placeholder="e.g., Central Valley, California or Coordinates"
                           {...field}
                           disabled={isFetchingAnyData}
                           onChange={(e) => {
                               debouncedFetchAndUpdateClimate.cancel?.();
                               debouncedFetchAndUpdateSoil.cancel?.(); // Cancel soil debounce too
                               field.onChange(e);
                           }}
                         />
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           className="flex-shrink-0"
                           onClick={() => fetchAllDataForLocation(locationValue)}
                           disabled={isFetchingAnyData || !locationValue || locationValue.trim().length < 3 || /Coords:/.test(locationValue)}
                           title="Fetch/Refresh climate and soil data based on current location text"
                         >
                           <RefreshCw className={`h-4 w-4 ${(isFetchingClimate || isFetchingSoil) ? 'animate-spin' : ''}`} />
                         </Button>
                     </div>
                  </FormControl>
                  <FormDescription>
                    Place name, address, or use button. Use <RefreshCw className="inline h-3 w-3 align-text-bottom"/> to fetch climate & soil.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="desiredCrops"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Sprout className="h-5 w-5 text-primary" />
                    Desired Crops (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., tomatoes, lettuce, strawberries" {...field} disabled={isLoading || isFetchingAnyData}/>
                  </FormControl>
                  <FormDescription>
                    List specific crops you're interested in (comma-separated).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

           {/* Map Placeholder */}
            <MapPlaceholder latitude={currentLatitude} longitude={currentLongitude} locationName={locationValue} isFetchingLocation={isFetchingLocation} />

        </div>

        {/* Environmental Parameters Section */}
        <Card className="shadow-sm border border-primary/10 relative">
          {(isFetchingClimate || isFetchingLocation) && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
               <Loader2 className="h-6 w-6 animate-spin text-primary"/>
               <span className="ml-2 text-sm text-primary">{isFetchingLocation ? 'Getting Location...' : 'Fetching Climate...'}</span>
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-xl">Environmental Parameters</CardTitle>
            <CardDescription>Use sliders or fetch typical values based on location using <RefreshCw className="inline h-3 w-3 align-text-bottom"/>. </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-primary" />
                      Avg. Temperature (°C)
                    </FormLabel>
                    <span className="text-sm font-medium text-primary w-16 text-right">{temperatureValue.toFixed(1)}°C</span>
                  </div>
                  <FormControl>
                     <Slider
                       value={[field.value]}
                       onValueChange={(value) => field.onChange(value[0])}
                       min={CropFormSchemaRanges.temperature.min}
                       max={CropFormSchemaRanges.temperature.max}
                       step={0.5}
                       aria-label="Temperature Slider"
                       disabled={isFetchingAnyData}
                     />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{CropFormSchemaRanges.temperature.min}°C</span>
                      <span>{CropFormSchemaRanges.temperature.max}°C</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="humidity"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center mb-2">
                      <FormLabel className="flex items-center gap-2">
                        <Droplets className="h-5 w-5 text-primary" />
                        Avg. Humidity (%)
                      </FormLabel>
                      <span className="text-sm font-medium text-primary w-16 text-right">{humidityValue}%</span>
                  </div>
                  <FormControl>
                    <Slider
                       value={[field.value]}
                       onValueChange={(value) => field.onChange(value[0])}
                       min={CropFormSchemaRanges.humidity.min}
                       max={CropFormSchemaRanges.humidity.max}
                       step={1}
                       aria-label="Humidity Slider"
                       disabled={isFetchingAnyData}
                     />
                  </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{CropFormSchemaRanges.humidity.min}%</span>
                      <span>{CropFormSchemaRanges.humidity.max}%</span>
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="rainfall"
              render={({ field }) => (
                <FormItem>
                   <div className="flex justify-between items-center mb-2">
                     <FormLabel className="flex items-center gap-2">
                       <CloudRain className="h-5 w-5 text-primary" />
                       Avg. Monthly Rainfall (mm)
                     </FormLabel>
                     <span className="text-sm font-medium text-primary w-16 text-right">{rainfallValue}mm</span>
                   </div>
                  <FormControl>
                     <Slider
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={CropFormSchemaRanges.rainfall.min}
                        max={CropFormSchemaRanges.rainfall.max}
                        step={5}
                        aria-label="Rainfall Slider"
                        disabled={isFetchingAnyData}
                      />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                     <span>{CropFormSchemaRanges.rainfall.min}mm</span>
                     <span>{CropFormSchemaRanges.rainfall.max}mm</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Soil Parameters Section */}
        <Card className="shadow-sm border border-primary/10 relative">
          {(isFetchingSoil || isFetchingLocation) && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
               <Loader2 className="h-6 w-6 animate-spin text-primary"/>
               <span className="ml-2 text-sm text-primary">{isFetchingLocation ? 'Getting Location...' : 'Fetching Soil...'}</span>
            </div>
          )}
          <CardHeader>
              <CardTitle className="text-xl">Soil Parameters</CardTitle>
              <CardDescription>Use sliders or fetch typical values based on location using <RefreshCw className="inline h-3 w-3 align-text-bottom"/>.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
             <FormField
               control={form.control}
               name="nitrogen"
               render={({ field }) => (
                 <FormItem>
                   <div className="flex justify-between items-center mb-2">
                     <FormLabel className="flex items-center gap-2">
                       <Atom className="h-5 w-5 text-primary" /> {/* Icon for Nitrogen */}
                       Nitrogen (N) content (kg/ha)
                     </FormLabel>
                     <span className="text-sm font-medium text-primary w-16 text-right">{nitrogenValue} kg/ha</span>
                   </div>
                   <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={CropFormSchemaRanges.nitrogen.min}
                        max={CropFormSchemaRanges.nitrogen.max}
                        step={1}
                        aria-label="Nitrogen Slider"
                        disabled={isFetchingAnyData}
                      />
                   </FormControl>
                   <div className="flex justify-between text-xs text-muted-foreground">
                       <span>{CropFormSchemaRanges.nitrogen.min}</span>
                       <span>{CropFormSchemaRanges.nitrogen.max}</span>
                   </div>
                   <FormMessage />
                 </FormItem>
               )}
             />
              <FormField
               control={form.control}
               name="phosphorus"
               render={({ field }) => (
                 <FormItem>
                   <div className="flex justify-between items-center mb-2">
                     <FormLabel className="flex items-center gap-2">
                        <Blend className="h-5 w-5 text-primary" /> {/* Icon for Phosphorus */}
                       Phosphorus (P) content (kg/ha)
                     </FormLabel>
                     <span className="text-sm font-medium text-primary w-16 text-right">{phosphorusValue} kg/ha</span>
                   </div>
                   <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={CropFormSchemaRanges.phosphorus.min}
                        max={CropFormSchemaRanges.phosphorus.max}
                        step={1}
                        aria-label="Phosphorus Slider"
                        disabled={isFetchingAnyData}
                      />
                   </FormControl>
                   <div className="flex justify-between text-xs text-muted-foreground">
                       <span>{CropFormSchemaRanges.phosphorus.min}</span>
                       <span>{CropFormSchemaRanges.phosphorus.max}</span>
                   </div>
                   <FormMessage />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="potassium"
               render={({ field }) => (
                 <FormItem>
                   <div className="flex justify-between items-center mb-2">
                     <FormLabel className="flex items-center gap-2">
                        <Atom className="h-5 w-5 text-primary rotate-90" /> {/* Reused Atom, rotated */}
                       Potassium (K) content (kg/ha)
                     </FormLabel>
                     <span className="text-sm font-medium text-primary w-16 text-right">{potassiumValue} kg/ha</span>
                   </div>
                   <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={CropFormSchemaRanges.potassium.min}
                        max={CropFormSchemaRanges.potassium.max}
                        step={1}
                        aria-label="Potassium Slider"
                        disabled={isFetchingAnyData}
                      />
                   </FormControl>
                   <div className="flex justify-between text-xs text-muted-foreground">
                       <span>{CropFormSchemaRanges.potassium.min}</span>
                       <span>{CropFormSchemaRanges.potassium.max}</span>
                   </div>
                   <FormMessage />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="ph"
               render={({ field }) => (
                 <FormItem>
                   <div className="flex justify-between items-center mb-2">
                     <FormLabel className="flex items-center gap-2">
                       <Beaker className="h-5 w-5 text-primary" /> {/* Icon for pH */}
                       pH value
                     </FormLabel>
                     <span className="text-sm font-medium text-primary w-16 text-right">{phValue.toFixed(2)}</span>
                   </div>
                   <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={CropFormSchemaRanges.ph.min}
                        max={CropFormSchemaRanges.ph.max}
                        step={0.01}
                        aria-label="pH Slider"
                        disabled={isFetchingAnyData}
                      />
                   </FormControl>
                   <div className="flex justify-between text-xs text-muted-foreground">
                       <span>{CropFormSchemaRanges.ph.min.toFixed(2)}</span>
                       <span>{CropFormSchemaRanges.ph.max.toFixed(2)}</span>
                   </div>
                   <FormMessage />
                 </FormItem>
               )}
             />
          </CardContent>
        </Card>


        {/* Soil Type & Appearance Section */}
         <FormField
          control={form.control}
          name="soilType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                 <ImageIcon className="h-5 w-5 text-primary" />
                 Soil Type & Appearance (Optional)
              </FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                 <div className="md:col-span-2">
                   <FormControl>
                     <Input placeholder="e.g., Loam, Clay, Sandy, Dark Brown, Crumbly" {...field} disabled={isLoading || isFetchingAnyData}/>
                   </FormControl>
                   <FormDescription>
                    Describe the soil type or appearance if known. AI will estimate if left blank.
                   </FormDescription>
                   <FormMessage />
                 </div>
                 <div className="w-full">
                    <AspectRatio ratio={4 / 3} className="bg-muted/50 rounded-md border border-dashed flex items-center justify-center overflow-hidden">
                      <Image
                          src={`https://picsum.photos/seed/${field.value || 'soil-default'}/400/300`}
                          alt="Soil type placeholder image"
                          width={400}
                          height={300}
                          className="rounded-md object-cover w-full h-full"
                          data-ai-hint="soil texture close up ground earth"
                          key={field.value || 'soil-default'}
                        />
                    </AspectRatio>
                     <p className="text-xs text-muted-foreground text-center mt-1">Soil Visual (Placeholder)</p>
                  </div>
              </div>
            </FormItem>
          )}
        />

         {/* Historical Yield and Other Parameters Section */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="historicalYieldData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Historical Yield Data (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Corn: 5 tons/acre (2023), Soybeans: 2 tons/acre (2022)" {...field} rows={3} disabled={isLoading || isFetchingAnyData}/>
                  </FormControl>
                  <FormDescription>
                    Provide past yield data if available. AI estimates if blank.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
             <FormField
              control={form.control}
              name="otherRelevantParameters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    Other Relevant Parameters (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Water availability, specific pest issues, market prices, nearby industries" {...field} rows={3} disabled={isLoading || isFetchingAnyData}/>
                  </FormControl>
                  <FormDescription>
                    Include any other factors that might influence crop choice or yield.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>


        <Button type="submit" disabled={isLoading || isFetchingAnyData} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Predicting...
            </>
          ) : isFetchingAnyData ? (
             <>
               <Loader2 className="mr-2 h-5 w-5 animate-spin" />
               {isFetchingLocation ? 'Getting Location...' : isFetchingClimate ? 'Fetching Climate...' : 'Fetching Soil...'}
             </>
           ) : (
            <>
              <BrainCircuit className="mr-2 h-5 w-5" />
              Predict Suitable Crops
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
