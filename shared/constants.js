export const chinaCities = [
  { id: "huangshan", name: { en: "Huangshan, Anhui", zh: "安徽黄山" }, countryCode: "CN", center: [118.3376, 29.7147] },
  { id: "beijing", name: { en: "Beijing", zh: "北京" }, countryCode: "CN", center: [116.4074, 39.9042] },
  { id: "shanghai", name: { en: "Shanghai", zh: "上海" }, countryCode: "CN", center: [121.4737, 31.2304] },
  { id: "xian", name: { en: "Xi'an", zh: "西安" }, countryCode: "CN", center: [108.9398, 34.3416] },
  { id: "chengdu", name: { en: "Chengdu", zh: "成都" }, countryCode: "CN", center: [104.0665, 30.5728] },
  { id: "hangzhou", name: { en: "Hangzhou", zh: "杭州" }, countryCode: "CN", center: [120.1551, 30.2741] },
  { id: "guilin", name: { en: "Guilin", zh: "桂林" }, countryCode: "CN", center: [110.2902, 25.2736] },
  { id: "kunming", name: { en: "Kunming", zh: "昆明" }, countryCode: "CN", center: [102.8329, 24.8801] },
  { id: "chongqing", name: { en: "Chongqing", zh: "重庆" }, countryCode: "CN", center: [106.5516, 29.563] },
  { id: "guangzhou", name: { en: "Guangzhou", zh: "广州" }, countryCode: "CN", center: [113.2644, 23.1291] },
  { id: "suzhou", name: { en: "Suzhou", zh: "苏州" }, countryCode: "CN", center: [120.5853, 31.2989] },
  { id: "nanjing", name: { en: "Nanjing", zh: "南京" }, countryCode: "CN", center: [118.7969, 32.0603] },
  { id: "zhangjiajie", name: { en: "Zhangjiajie", zh: "张家界" }, countryCode: "CN", center: [110.4792, 29.1171] }
];

export const cityIds = chinaCities.map((city) => city.id);

export const poiCategories = [
  "natural_scenery",
  "historical_relics",
  "city_landmarks",
  "local_street_food",
  "regional_cuisines",
  "boutique_homestays",
  "budget_hotels",
  "family_resorts"
];

export const tripStyles = ["budget", "food", "leisure"];
export const groupTypes = ["couple", "family_with_kids", "elderly_group", "solo", "student_group"];
export const accommodationTypes = ["boutique_homestay", "budget_hotel", "family_resort"];
export const tripStatuses = ["draft", "upcoming", "completed"];

export const tripMemberRoles = ["owner", "editor", "viewer"];
export const invitationStatuses = ["pending", "accepted", "declined", "revoked", "expired"];
export const expenseCategories = [
  "accommodation",
  "transportation",
  "food",
  "attractions",
  "entertainment",
  "other"
];

export function getCity(id) {
  return chinaCities.find((city) => city.id === id);
}
