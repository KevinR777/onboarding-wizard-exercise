import { useMutation, useQueryClient } from '@tanstack/react-query'
import { goLive as goLiveRequest } from '../api/sessions'

export const useGoLive = () => {
  const queryClient = useQueryClient()
  const { mutateAsync: goLive, isPending, isError } = useMutation({
    mutationFn: (sessionId: string) => goLiveRequest(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    },
  })

  return { goLive, isPending, isError }
}
