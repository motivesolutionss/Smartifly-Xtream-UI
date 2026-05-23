import { XtreamClient } from "./xtream/xtreamClient";
import { LocalUserDataService } from "./local/localUserDataService";
import type { AccountService } from "./interfaces/accountService";
import type { ContentService } from "./interfaces/contentService";
import type { PlaybackService } from "./interfaces/playbackService";
import type { UserDataService } from "./interfaces/userDataService";

// For now, we only have Xtream implementation
const xtreamInstance = new XtreamClient();
const localUserDataService = new LocalUserDataService();

export const services = {
  content: xtreamInstance as ContentService,
  account: xtreamInstance as AccountService,
  playback: xtreamInstance as PlaybackService,
  userData: localUserDataService as UserDataService,
};

// Method to re-initialize services with new credentials
export const initializeServices = (
  serverUrl: string,
  username: string,
  password: string
) => {
  xtreamInstance.setCredentials(serverUrl, username, password);
};
