import { useQuery } from "@tanstack/react-query";
import { services } from "../../../services";
import { playlistStorage } from "../../../storage/playlistStorage";

export const useAccountInfo = () => {
  const activePlaylist = playlistStorage.getActivePlaylist();

  return useQuery({
    queryKey: ["account-info", activePlaylist?.id],
    queryFn: async () => {
      if (!activePlaylist) return null;
      return services.account.getAccountInfo();
    },
    enabled: !!activePlaylist,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
