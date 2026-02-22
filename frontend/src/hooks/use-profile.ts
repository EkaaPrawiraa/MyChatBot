import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  profileService,
  type ProfileUpdateRequest,
} from "@/src/services/profile-service";
import { QUERY_KEYS } from "@/lib/constants";
import type { UserProfile } from "@/types";

export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: () => profileService.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 0,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProfileUpdateRequest) =>
      profileService.updateProfile(request),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.PROFILE });

      const previousProfile = queryClient.getQueryData<UserProfile>(
        QUERY_KEYS.PROFILE,
      );
      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(QUERY_KEYS.PROFILE, {
          ...previousProfile,
          ...request,
          sidebarMenus: request.sidebarMenus ?? previousProfile.sidebarMenus,
        });
      }

      return { previousProfile };
    },
    onError: (_err, _request, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(QUERY_KEYS.PROFILE, context.previousProfile);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
  });
}
