import { XtreamClient } from "./xtream/xtreamClient";
import { LocalUserDataService } from "./local/localUserDataService";
import type { AccountService } from "./interfaces/accountService";
import type { AnalyticsService } from "./interfaces/analyticsService";
import type { ContentService } from "./interfaces/contentService";
import type { PlaybackService } from "./interfaces/playbackService";
import type { UserDataService } from "./interfaces/userDataService";
import { BackendAnalyticsClient, NoopAnalyticsClient } from "./backend/backendAnalyticsClient";
import { AppError } from "../types/errors";

// For now, we only have Xtream implementation
const xtreamInstance = new XtreamClient();
const localUserDataService = new LocalUserDataService();
const analyticsInstance: AnalyticsService = (() => {
  try {
    return new BackendAnalyticsClient();
  } catch (error) {
    if (error instanceof AppError && error.code === "BACKEND_NOT_CONFIGURED") {
      return new NoopAnalyticsClient();
    }
    return new NoopAnalyticsClient();
  }
})();

export const services = {
  content: xtreamInstance as ContentService,
  account: xtreamInstance as AccountService,
  playback: xtreamInstance as PlaybackService,
  userData: localUserDataService as UserDataService,
  analytics: analyticsInstance,
};

// Method to re-initialize services with new credentials
export const initializeServices = (
  serverUrl: string,
  username: string,
  password: string
) => {
  xtreamInstance.setCredentials(serverUrl, username, password);
};
