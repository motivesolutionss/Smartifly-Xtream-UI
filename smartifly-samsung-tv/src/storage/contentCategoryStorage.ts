import { localStorageService } from "./localStorageService";

const VOD_LAST_CATEGORY_KEY = "smartifly_vod_last_category";
const SERIES_LAST_CATEGORY_KEY = "smartifly_series_last_category";

const readValue = (key: string) => {
  const value = localStorageService.get<string>(key);
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const writeValue = (key: string, value: string | null) => {
  if (!value) {
    localStorageService.remove(key);
    return;
  }
  localStorageService.set(key, value.trim());
};

export const contentCategoryStorage = {
  getVodLastCategoryId: () => readValue(VOD_LAST_CATEGORY_KEY),
  setVodLastCategoryId: (categoryId: string | null) =>
    writeValue(VOD_LAST_CATEGORY_KEY, categoryId),

  getSeriesLastCategoryId: () => readValue(SERIES_LAST_CATEGORY_KEY),
  setSeriesLastCategoryId: (categoryId: string | null) =>
    writeValue(SERIES_LAST_CATEGORY_KEY, categoryId),
};
