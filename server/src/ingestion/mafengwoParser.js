import * as cheerio from "cheerio";
import { rawAttractionSchema } from "./contracts.js";

function integer(value) {
  const match = String(value ?? "").replaceAll(",", "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function parseMafengwoCatalog(html, context) {
  const $ = cheerio.load(html);
  const records = [];

  $("a.spot.poi").each((_index, element) => {
    const card = $(element);
    const counts = card.find(".t3 strong").map((_i, node) => integer($(node).text())).get();
    const href = card.attr("href");
    const image = card.find(".photo img").attr("src");

    const candidate = {
      externalId: card.attr("data-id")?.trim(),
      nameZh: card.find(".t1").text().trim(),
      nameEn: card.find(".t2").text().trim() || null,
      locationLabel: card.find(".t4").text().trim() || null,
      thumbnailUrl: image ? new URL(image, context.sourcePageUrl).href : null,
      reviewCount: counts[0] ?? 0,
      travelNoteCount: counts[1] ?? 0,
      imageCount: integer(card.find(".go").text()),
      sourceUrl: new URL(href, context.sourcePageUrl).href,
      sourcePageUrl: context.sourcePageUrl,
      externalSource: context.provider,
      province: context.province,
      regionId: context.regionId,
      retrievedAt: context.retrievedAt
    };

    const parsed = rawAttractionSchema.safeParse(candidate);
    if (parsed.success) records.push(parsed.data);
  });

  if (!records.length) {
    const error = new Error("The source page contained no valid attraction cards.");
    error.code = "SOURCE_PARSE_EMPTY";
    throw error;
  }
  return records;
}
