import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { profileService, type ProfileUpdateRequest } from '@/src/services/profile-service'
import { QUERY_KEYS } from '@/lib/constants'

export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: () => profileService.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ProfileUpdateRequest) => profileService.updateProfile(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE })
    },
  })
}
