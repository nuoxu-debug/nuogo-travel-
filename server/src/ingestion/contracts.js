import { z } from "zod";

const nullableText = z.string().trim().min(1).nullable().default(null);
const count = z.number().int().nonnegative().default(0);
const mafengwoPageUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "m.mafengwo.cn";
}, {
  message: "Source URL must use HTTPS on m.mafengwo.cn."
});

export const rawAttractionSchema = z.object({
  externalId: z.string().trim().min(1),
  nameZh: z.string().trim().min(1),
  nameEn: nullableText,
  locationLabel: nullableText,
  thumbnailUrl: z.string().url().nullable().default(null),
  reviewCount: count,
  travelNoteCount: count,
  imageCount: count,
  sourceUrl: mafengwoPageUrl,
  sourcePageUrl: mafengwoPageUrl,
  externalSource: z.literal("mafengwo"),
  province: z.literal("Anhui"),
  regionId: z.string().trim().min(1),
  retrievedAt: z.string().datetime()
}).strict();

export const attractionRecordSchema = rawAttractionSchema.extend({
  descriptionZh: nullableText,
  descriptionEn: nullableText,
  address: nullableText,
  longitude: z.number().min(114.8).max(119.7).nullable().default(null),
  latitude: z.number().min(29.4).max(34.7).nullable().default(null),
  ticketPriceMin: z.number().nonnegative().nullable().default(null),
  ticketPriceMax: z.number().nonnegative().nullable().default(null),
  openingHours: nullableText,
  category: nullableText,
  reviewStatus: z.enum(["pending", "approved", "rejected"]).default("pending"),
  active: z.boolean().default(true)
}).strict();
