import { useMutation } from '@tanstack/react-query'
import { submitDetails as submitDetailsRequest } from '../api/sessions'
import type { SubmitDetailsInput } from '../api/sessions'

export type SubmitDetailsVariables = SubmitDetailsInput & { sessionId: string }

export const useSubmitDetails = () => {
  const { mutateAsync: submitDetails, isPending, isError } = useMutation({
    mutationFn: ({ sessionId, ...input }: SubmitDetailsVariables) => submitDetailsRequest(sessionId, input),
  })

  return { submitDetails, isPending, isError }
}
