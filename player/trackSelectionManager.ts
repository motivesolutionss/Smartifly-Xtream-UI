import { avplayAdapter } from "./avplayAdapter";

export type TrackType = "audio" | "text" | "video";

export type TrackInfo = {
  id: string;
  label: string;
  isSelected: boolean;
  groupIndex: number;
  trackIndex: number;
};

export type TrackCapabilities = {
  canSelectTracks: boolean;
  audioTrackCount: number;
  subtitleTrackCount: number;
  qualityTrackCount: number;
};

type RawTrackInfo = {
  type?: string;
  index?: number;
  language?: string;
  extra_info?: string;
  fourCC?: string;
};

const mapTrackTypeForAvplay = (type: TrackType) => {
  switch (type) {
    case "audio":
      return "AUDIO";
    case "text":
      return "TEXT";
    case "video":
      return "VIDEO";
    default:
      return "AUDIO";
  }
};

const normalizeTrackType = (type: unknown): TrackType | null => {
  const value = String(type || "").toUpperCase();
  if (value.includes("AUDIO")) return "audio";
  if (value.includes("TEXT") || value.includes("SUBTITLE")) return "text";
  if (value.includes("VIDEO")) return "video";
  return null;
};

const safeParseTrackList = (): RawTrackInfo[] => {
  try {
    const trackInfo = avplayAdapter.getTotalTrackInfo();
    if (!Array.isArray(trackInfo)) return [];
    return trackInfo as RawTrackInfo[];
  } catch {
    return [];
  }
};

export class TrackSelectionManager {
  private selectedByType: Partial<Record<TrackType, number>> = {};

  getCapabilities(): TrackCapabilities {
    if (!avplayAdapter.isAvailable() || !avplayAdapter.supportsTrackSelection()) {
      return {
        canSelectTracks: false,
        audioTrackCount: 0,
        subtitleTrackCount: 0,
        qualityTrackCount: 0,
      };
    }

    return {
      canSelectTracks: true,
      audioTrackCount: this.getTracksByType("audio").length,
      subtitleTrackCount: this.getTracksByType("text").length,
      qualityTrackCount: this.getTracksByType("video").length,
    };
  }

  getSubtitleTracks() {
    const tracks = this.getTracksByType("text");
    const hasActiveText = tracks.some((track) => track.isSelected);
    return [
      {
        id: "text-off",
        label: "Off",
        isSelected: !hasActiveText,
        groupIndex: -1,
        trackIndex: -1,
      },
      ...tracks,
    ];
  }

  getAudioTracks() {
    return this.getTracksByType("audio");
  }

  getVideoTracks() {
    const tracks = this.getTracksByType("video");
    return [
      {
        id: "video-auto",
        label: tracks.length > 0 ? "Auto" : "Source",
        isSelected: !tracks.some((track) => track.isSelected),
        groupIndex: -1,
        trackIndex: -1,
      },
      ...tracks,
    ];
  }

  selectTrack(track: TrackInfo, type: TrackType) {
    if (track.trackIndex < 0) {
      if (type === "text") {
        // No dedicated OFF API in AVPlay. We keep logical state and avoid selecting any subtitle track.
        this.selectedByType.text = -1;
      }
      if (type === "video") {
        this.selectedByType.video = -1;
      }
      return;
    }

    avplayAdapter.selectTrack(mapTrackTypeForAvplay(type), track.trackIndex);
    this.selectedByType[type] = track.trackIndex;
  }

  private getTracksByType(type: TrackType): TrackInfo[] {
    const list = safeParseTrackList();
    const mapped = list
      .map((raw, index) => ({ raw, index, normalized: normalizeTrackType(raw.type) }))
      .filter((entry) => entry.normalized === type)
      .map((entry, localIndex) => {
        const trackIndex =
          typeof entry.raw.index === "number" && Number.isFinite(entry.raw.index)
            ? entry.raw.index
            : localIndex;
        const selectedIndex = this.selectedByType[type];
        const isSelected =
          selectedIndex === undefined ? localIndex === 0 : selectedIndex === trackIndex;

        return {
          id: `${type}-${trackIndex}`,
          label: this.buildLabel(type, entry.raw, localIndex),
          isSelected,
          groupIndex: 0,
          trackIndex,
        } satisfies TrackInfo;
      });

    return mapped;
  }

  private buildLabel(type: TrackType, raw: RawTrackInfo, index: number) {
    if (type === "video") {
      const qualityHint = String(raw.extra_info || "").match(/\d{3,4}p/i)?.[0];
      if (qualityHint) return qualityHint.toUpperCase();
      return `Quality ${index + 1}`;
    }

    const language = String(raw.language || "").trim();
    if (language) return language.toUpperCase();

    const codec = String(raw.fourCC || "").trim();
    if (codec) return codec.toUpperCase();

    return `${type === "audio" ? "Audio" : "Subtitle"} ${index + 1}`;
  }
}
