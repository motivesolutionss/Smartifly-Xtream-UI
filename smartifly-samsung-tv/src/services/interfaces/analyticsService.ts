import type { AppMovie } from "../../types/appModels";

export type SmartRow = {
  title: string;
  items: AppMovie[];
};

export interface AnalyticsService {
  getTrendingIds(): Promise<string[]>;
  getSmartRows(profileId: string): Promise<SmartRow[]>;
}
