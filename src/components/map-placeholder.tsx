"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react"; // Added Loader2

interface MapPlaceholderProps {
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  isFetchingLocation?: boolean; // Added prop
}

// Basic debounce function
function debounce<F extends (...args: any[]) => void>(func: F, wait: number): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function(this: ThisParameterType<F>, ...args: Parameters<F>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}


export function MapPlaceholder({ latitude, longitude, locationName, isFetchingLocation }: MapPlaceholderProps) {
  const [error, setError] = React.useState<string | null>(null);

  // Helper to build OpenStreetMap embed URL
  const getOsmEmbedUrl = (lat: number, lon: number) => {
    const zoom = 13;
    const bboxOffset = 0.03; // ~3km
    const left = lon - bboxOffset;
    const right = lon + bboxOffset;
    const top = lat + bboxOffset;
    const bottom = lat - bboxOffset;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left},${bottom},${right},${top}&layer=mapnik&marker=${lat},${lon}`;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Location Visualizer
        </CardTitle>
      </CardHeader>
      <CardContent>
         {isFetchingLocation && (
           <div className="aspect-video w-full flex items-center justify-center bg-muted/50 rounded-md border border-dashed">
             <div className="text-center">
               <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2"/>
               <p className="text-muted-foreground text-sm">Getting current location...</p>
             </div>
           </div>
         )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {/* Show OpenStreetMap iframe if coordinates are present and not fetching location */}
        {!isFetchingLocation && !error && latitude != null && longitude != null && (
          <div className="aspect-video w-full relative overflow-hidden rounded-md border">
            <iframe
              title="OpenStreetMap"
              src={getOsmEmbedUrl(latitude, longitude)}
              width="100%"
              height="100%"
              style={{ border: 0, width: '100%', height: '100%' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

         {/* Show placeholder text if not loading and no map is ready */}
         {!isFetchingLocation && !error && (latitude == null || longitude == null) && (
          <div className="aspect-video w-full flex items-center justify-center bg-muted/50 rounded-md border border-dashed">
            <p className="text-muted-foreground text-center p-4 text-sm">
              {locationName && !/Coords:/.test(locationName)
                ? `Map preview will appear here for ${locationName}.`
                : locationName && /Coords:/.test(locationName)
                ? 'Map preview appears when using "Use Current Location".'
                : "Enter a location or use current location to see map preview."}
            </p>
          </div>
        )}

         {!isFetchingLocation && locationName && <p className="text-sm text-muted-foreground mt-2">Showing map for: {locationName}</p>}
         {!isFetchingLocation && latitude != null && longitude != null && (
           <p className="text-xs text-muted-foreground">Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}</p>
         )}
      </CardContent>
    </Card>
  );
}
