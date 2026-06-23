import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { services } from "../../services";
import { createPlaylistId } from "../../storage/playlistStorage";
import { useAuthStore } from "../../store/authStore";
import { getUserFriendlyErrorMessage } from "../../utils/errorMapper";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";
import { createPerfTrace } from "../../utils/perfTrace";
import { ensureLiveContentAvailable } from "./liveContentProbe";

type ConnectionState = "idle" | "testing" | "success" | "error";

export type ConnectionTestResult = {
  liveCategoryCount: number;
  validatedLiveStreamCount: number;
  usedCatalogFallback: boolean;
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
      const trace = createPerfTrace("connection_test", {
        playlistName: input.playlistName.trim() || input.username.trim(),
      });
      const normalizedServerUrl = normalizeServerUrl(input.serverUrl);
      const username = input.username.trim();

      try {
        await services.account.validateCredentials(
          normalizedServerUrl,
          username,
          input.password
        );
        trace.mark("credentials_validated", {
          metricName: "connection_test_credentials_validated_ms",
          slowAboveMs: 450,
        });

        const liveProbe = await ensureLiveContentAvailable(services.content);
        trace.mark("live_content_validated", {
          metricName: "connection_test_live_content_validated_ms",
          slowAboveMs: 650,
          data: {
            liveCategoryCount: liveProbe.liveCategoryCount,
            validatedLiveStreamCount: liveProbe.validatedLiveStreamCount,
            usedCatalogFallback: liveProbe.usedCatalogFallback,
          },
        });

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
        trace.end({
          status: "completed",
          metricName: "connection_test_total_ms",
          slowAboveMs: 1800,
          data: {
            playlistId: playlist.id,
          },
        });

        return {
          liveCategoryCount: liveProbe.liveCategoryCount,
          validatedLiveStreamCount: liveProbe.validatedLiveStreamCount,
          usedCatalogFallback: liveProbe.usedCatalogFallback,
        };
      } catch (error) {
        trace.fail(error, {
          metricName: "connection_test_total_ms",
          slowAboveMs: 1800,
        });
        throw error;
      }
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
