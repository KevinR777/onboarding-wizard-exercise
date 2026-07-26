import { useMutation } from '@tanstack/react-query'
import { createSession as createSessionRequest } from '../api/sessions'

export const useCreateSession = () => {
  const { mutateAsync: createSession, isPending, isError } = useMutation({
    mutationFn: createSessionRequest,
  })

  return { createSession, isPending, isError }
}
