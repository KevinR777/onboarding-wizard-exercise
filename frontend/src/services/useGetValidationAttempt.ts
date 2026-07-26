import { useQuery } from '@tanstack/react-query'
import { getValidationAttempt as getValidationAttemptRequest } from '../api/sessions'

export const validationAttemptQueryKey = (sessionId: string) => ['validationAttempt', sessionId] as const

export const useGetValidationAttempt = (sessionId: string) => {
  const { data, isLoading } = useQuery({
    queryKey: validationAttemptQueryKey(sessionId),
    queryFn: () => getValidationAttemptRequest(sessionId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (query) => (query.state.data?.attempt?.status === 'PENDING' ? 1000 : false),
  })

  return { attempt: data?.attempt, isLoading }
}
