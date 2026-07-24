export const anhuiRegions = Object.freeze({
  huangshan: {
    name: "Huangshan and Southern Anhui",
    source: {
      provider: "mafengwo",
      regionId: "huangshan",
      province: "Anhui",
      url: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18",
      sourceType: "destination_catalog",
      approved: true
    }
  },
  hefei: { name: "Hefei", source: null },
  chizhou: { name: "Chizhou and Jiuhua Mountain", source: null },
  xuancheng: { name: "Xuancheng", source: null },
  anqing: { name: "Anqing and Tianzhu Mountain", source: null },
  wuhu: { name: "Wuhu", source: null }
});

export function getRegionSource(regionId) {
  const region = anhuiRegions[regionId];
  if (!region) throw new Error(`Unknown Anhui region: ${regionId}`);
  if (!region.source?.approved) {
    throw new Error(`${region.name} does not have an approved source URL yet.`);
  }
  return structuredClone(region.source);
}
