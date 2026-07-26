import { useQuery } from '@tanstack/react-query'
import { getSession as getSessionRequest } from '../api/sessions'

export const useGetSession = (sessionId: string) => {
  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionRequest(sessionId),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  return { session, isLoading, isError }
}
