import { useParams } from 'react-router'
import { useToast } from '../../../Toast/useToast'
import { useGetSession } from '../../../../services/useGetSession'
import { useGetValidationAttempt } from '../../../../services/useGetValidationAttempt'
import { useGoLive } from '../../../../services/useGoLive'

export const useReviewStep = () => {
  const { sessionId } = useParams() as { sessionId: string }
  const { showToast } = useToast()
  const { session } = useGetSession(sessionId)
  const { attempt } = useGetValidationAttempt(sessionId)
  const { goLive } = useGoLive()

  const companyName = session?.companyName ?? null
  const status = attempt?.status ?? null
  const items = attempt?.status === 'VALID' || attempt?.status === 'PARTIAL' ? attempt.payload.items : null
  const warnings = attempt?.status === 'PARTIAL' ? attempt.payload.warnings : null

  const handleGoLive = async () => {
    try {
      await goLive(sessionId)
    } catch {
      showToast('Failed to go live. Please try again.')
    }
  }

  return { companyName, status, items, warnings, handleGoLive }
}
