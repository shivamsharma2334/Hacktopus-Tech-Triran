import * as z from "zod";

const TEMP_MIN = 0;
const TEMP_MAX = 45;
const HUMIDITY_MIN = 0;
const HUMIDITY_MAX = 100;
const RAINFALL_MIN = 0;
const RAINFALL_MAX = 300;

const NITROGEN_MIN = 0;
const NITROGEN_MAX = 140;
const PHOSPHORUS_MIN = 5;
const PHOSPHORUS_MAX = 145;
const POTASSIUM_MIN = 5;
const POTASSIUM_MAX = 205;
const PH_MIN = 3.5;
const PH_MAX = 10.0;


export const CropFormSchema = z.object({
  location: z.string().min(3, {
    message: "Location must be at least 3 characters.",
  }).max(100, { message: "Location must be under 100 characters."}),
  desiredCrops: z.string().max(200, { message: "Desired crops list too long (max 200 chars)."}).optional(),
  soilType: z.string().max(100, { message: "Soil type description too long (max 100 chars)."}).optional(),

  temperature: z.number({ coerce: true })
                .min(TEMP_MIN, `Temperature cannot be below ${TEMP_MIN}°C`)
                .max(TEMP_MAX, `Temperature cannot exceed ${TEMP_MAX}°C`)
                .default(25)
                .describe(`Average temperature in Celsius (Range: ${TEMP_MIN}-${TEMP_MAX})`),
  humidity: z.number({ coerce: true })
             .min(HUMIDITY_MIN, `Humidity cannot be below ${HUMIDITY_MIN}%`)
             .max(HUMIDITY_MAX, `Humidity cannot exceed ${HUMIDITY_MAX}%`)
             .default(70)
             .describe(`Average humidity percentage (Range: ${HUMIDITY_MIN}-${HUMIDITY_MAX})`),
  rainfall: z.number({ coerce: true })
             .min(RAINFALL_MIN, `Rainfall cannot be below ${RAINFALL_MIN}mm`)
             .max(RAINFALL_MAX, `Rainfall cannot exceed ${RAINFALL_MAX}mm`)
             .default(100)
             .describe(`Average monthly rainfall in mm (Range: ${RAINFALL_MIN}-${RAINFALL_MAX})`),
 
  nitrogen: z.number({ coerce: true })
            .min(NITROGEN_MIN, `Nitrogen cannot be below ${NITROGEN_MIN} kg/ha`)
            .max(NITROGEN_MAX, `Nitrogen cannot exceed ${NITROGEN_MAX} kg/ha`)
            .default(50)
            .describe(`Nitrogen (N) content in kg/ha (Range: ${NITROGEN_MIN}-${NITROGEN_MAX})`),
  phosphorus: z.number({ coerce: true })
            .min(PHOSPHORUS_MIN, `Phosphorus cannot be below ${PHOSPHORUS_MIN} kg/ha`)
            .max(PHOSPHORUS_MAX, `Phosphorus cannot exceed ${PHOSPHORUS_MAX} kg/ha`)
            .default(82)
            .describe(`Phosphorus (P) content in kg/ha (Range: ${PHOSPHORUS_MIN}-${PHOSPHORUS_MAX})`),
  potassium: z.number({ coerce: true })
            .min(POTASSIUM_MIN, `Potassium cannot be below ${POTASSIUM_MIN} kg/ha`)
            .max(POTASSIUM_MAX, `Potassium cannot exceed ${POTASSIUM_MAX} kg/ha`)
            .default(50)
            .describe(`Potassium (K) content in kg/ha (Range: ${POTASSIUM_MIN}-${POTASSIUM_MAX})`),
  ph: z.number({ coerce: true })
        .min(PH_MIN, `pH cannot be below ${PH_MIN}`)
        .max(PH_MAX, `pH cannot exceed ${PH_MAX}`)
        .step(0.01) 
        .default(6.60)
        .describe(`Soil pH value (Range: ${PH_MIN}-${PH_MAX})`),
  historicalYieldData: z.string().max(500, { message: "Historical yield data too long (max 500 chars)."}).optional(),
  otherParameters: z.string().max(500, { message: "Other parameters description too long (max 500 chars)."}).optional(),
  otherRelevantParameters: z.string().max(500,{ message : "other Relevant Parameters too long (max 500 chars)."}).optional(),
})
.extend({ 
    temperature: z.number({ coerce: true })
                  .min(TEMP_MIN).max(TEMP_MAX).default(25)
                  .describe(`Average temperature in Celsius (Range: ${TEMP_MIN}-${TEMP_MAX})`)
                  .refine(val => val >= TEMP_MIN && val <= TEMP_MAX, { message: 'Out of range' }),
    humidity: z.number({ coerce: true })
               .min(HUMIDITY_MIN).max(HUMIDITY_MAX).default(70)
               .describe(`Average humidity percentage (Range: ${HUMIDITY_MIN}-${HUMIDITY_MAX})`)
               .refine(val => val >= HUMIDITY_MIN && val <= HUMIDITY_MAX, { message: 'Out of range' }),
    rainfall: z.number({ coerce: true })
               .min(RAINFALL_MIN).max(RAINFALL_MAX).default(100)
               .describe(`Average monthly rainfall in mm (Range: ${RAINFALL_MIN}-${RAINFALL_MAX})`)
               .refine(val => val >= RAINFALL_MIN && val <= RAINFALL_MAX, { message: 'Out of range' }),
    // Add refinements for new soil parameters
     nitrogen: z.number({ coerce: true })
               .min(NITROGEN_MIN).max(NITROGEN_MAX).default(50)
               .describe(`Nitrogen (N) content in kg/ha (Range: ${NITROGEN_MIN}-${NITROGEN_MAX})`)
               .refine(val => val >= NITROGEN_MIN && val <= NITROGEN_MAX, { message: 'Out of range' }),
     phosphorus: z.number({ coerce: true })
               .min(PHOSPHORUS_MIN).max(PHOSPHORUS_MAX).default(82)
               .describe(`Phosphorus (P) content in kg/ha (Range: ${PHOSPHORUS_MIN}-${PHOSPHORUS_MAX})`)
               .refine(val => val >= PHOSPHORUS_MIN && val <= PHOSPHORUS_MAX, { message: 'Out of range' }),
    potassium: z.number({ coerce: true })
               .min(POTASSIUM_MIN).max(POTASSIUM_MAX).default(50)
               .describe(`Potassium (K) content in kg/ha (Range: ${POTASSIUM_MIN}-${POTASSIUM_MAX})`)
               .refine(val => val >= POTASSIUM_MIN && val <= POTASSIUM_MAX, { message: 'Out of range' }),
    ph: z.number({ coerce: true })
        .min(PH_MIN).max(PH_MAX).step(0.01).default(6.60)
        .describe(`Soil pH value (Range: ${PH_MIN}-${PH_MAX})`)
        .refine(val => val >= PH_MIN && val <= PH_MAX, { message: 'Out of range' }),
});


// Type alias for convenience
export type CropFormData = z.infer<typeof CropFormSchema>;

// Extract min/max for easier access in components
export const CropFormSchemaRanges = {
  temperature: { min: TEMP_MIN, max: TEMP_MAX },
  humidity: { min: HUMIDITY_MIN, max: HUMIDITY_MAX },
  rainfall: { min: RAINFALL_MIN, max: RAINFALL_MAX },
  nitrogen: { min: NITROGEN_MIN, max: NITROGEN_MAX },
  phosphorus: { min: PHOSPHORUS_MIN, max: PHOSPHORUS_MAX },
  potassium: { min: POTASSIUM_MIN, max: POTASSIUM_MAX },
  ph: { min: PH_MIN, max: PH_MAX },
};
