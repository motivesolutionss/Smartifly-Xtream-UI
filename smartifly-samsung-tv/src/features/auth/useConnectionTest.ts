import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { services } from "../../services";
import { createPlaylistId } from "../../storage/playlistStorage";
import { useAuthStore } from "../../store/authStore";
import { AppError } from "../../types/errors";
import { getUserFriendlyErrorMessage } from "../../utils/errorMapper";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";

type ConnectionState = "idle" | "testing" | "success" | "error";

export type ConnectionTestResult = {
  liveCategoryCount: number;
  liveStreamCount: number;
};

export const useConnectionTest = () => {
  const [state, setState] = useState<ConnectionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const setActivePlaylist = useAuthStore((store) => store.setActivePlaylist);

  const mutation = useMutation({
    mutationFn: async (input: {
      playlistName: string;
      serverUrl: string;
      username: string;
      password: string;
    }) => {
      const normalizedServerUrl = normalizeServerUrl(input.serverUrl);
      const username = input.username.trim();

      await services.account.validateCredentials(
        normalizedServerUrl,
        username,
        input.password
      );

      const [liveCategories, liveStreams] = await Promise.all([
        services.content.getLiveCategories(),
        services.content.getLiveStreams(),
      ]);

      if (liveCategories.length === 0 || liveStreams.length === 0) {
        throw new AppError("EMPTY_CONTENT", "No Live TV content found");
      }

      const playlist = {
        id: createPlaylistId(normalizedServerUrl, username),
        name: input.playlistName.trim() || username,
        serverUrl: normalizedServerUrl,
        username,
        password: input.password,
        addedAt: new Date().toISOString(),
      };

      await services.userData.savePlaylist(playlist);
      await services.userData.setActivePlaylistId(playlist.id);
      setActivePlaylist(playlist);

      return {
        liveCategoryCount: liveCategories.length,
        liveStreamCount: liveStreams.length,
      };
    },
  });

  const testConnection = async (input: {
    playlistName: string;
    serverUrl: string;
    username: string;
    password: string;
  }) => {
    setState("testing");
    setErrorMessage(null);
    setResult(null);

    try {
      const nextResult = await mutation.mutateAsync(input);
      setResult(nextResult);
      setState("success");
      return nextResult;
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error));
      setState("error");
      return null;
    }
  };

  return {
    state,
    errorMessage,
    result,
    isPending: mutation.isPending,
    testConnection,
  };
};
