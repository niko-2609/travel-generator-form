import * as z from 'zod'
const DATE_REQUIRED_ERROR = "Date is required.";


export const PromptSchema = z.object({
    travel_dates: z.object({
        from: z.date().optional(),
        to: z.date().optional(),
    }, { required_error: DATE_REQUIRED_ERROR }).refine((date) => {
        return !!date.from;
    }, DATE_REQUIRED_ERROR),
    source_city: z.string({
        required_error: "Password is required"
    }),
    destination_city: z.string({
        required_error: "Destination is required"
    }),
    travel_type: z.string().optional().default("Solo"),
    ecological: z.boolean().optional().default(false),
    mass_tourism: z.boolean().optional().default(false),
    diving: z.boolean().optional().default(false),
    surfing: z.boolean().optional().default(false),
    hiking: z.boolean().optional().default(false),
    climbing: z.boolean().optional().default(false),
    sightseeing: z.boolean().optional().default(false),
    stops_inbetween: z.string().optional().default("0"),
})