import { useMutation, useQueryClient } from '@tanstack/react-query'
import { triggerValidation as triggerValidationRequest } from '../api/sessions'
import { validationAttemptQueryKey } from './useGetValidationAttempt'

export const useTriggerValidation = () => {
  const queryClient = useQueryClient()
  const { mutateAsync: triggerValidation, isPending, isError } = useMutation({
    mutationFn: (sessionId: string) => triggerValidationRequest(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: validationAttemptQueryKey(sessionId) })
    },
  })

  return { triggerValidation, isPending, isError }
}
