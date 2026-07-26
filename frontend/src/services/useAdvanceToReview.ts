import { useMutation } from '@tanstack/react-query'
import { advanceToReview as advanceToReviewRequest } from '../api/sessions'

export const useAdvanceToReview = () => {
  const { mutateAsync: advanceToReview, isPending, isError } = useMutation({
    mutationFn: (sessionId: string) => advanceToReviewRequest(sessionId),
  })

  return { advanceToReview, isPending, isError }
}
