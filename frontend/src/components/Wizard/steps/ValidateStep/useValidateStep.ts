import { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { useToast } from '../../../Toast/useToast'
import { useGetValidationAttempt } from '../../../../services/useGetValidationAttempt'
import { useTriggerValidation } from '../../../../services/useTriggerValidation'
import { useAdvanceToReview } from '../../../../services/useAdvanceToReview'

export type UseValidateStepProps = {
  onNext: () => void
}

export const useValidateStep = ({ onNext }: UseValidateStepProps) => {
  const { sessionId } = useParams() as { sessionId: string }
  const { showToast } = useToast()
  const { attempt, isLoading } = useGetValidationAttempt(sessionId)
  const { triggerValidation } = useTriggerValidation()
  const { advanceToReview } = useAdvanceToReview()
  const hasAutoTriggeredRef = useRef(false)

  useEffect(() => {
    if (isLoading || hasAutoTriggeredRef.current) return
    hasAutoTriggeredRef.current = true
    if (attempt !== null) return

    const autoTrigger = async () => {
      try {
        await triggerValidation(sessionId)
      } catch {
        showToast('Failed to start validation. Please try again.')
      }
    }
    autoTrigger()
  }, [attempt, isLoading, sessionId, triggerValidation, showToast])

  const status = attempt?.status ?? 'PENDING'
  const items = attempt?.status === 'VALID' || attempt?.status === 'PARTIAL' ? attempt.payload.items : null
  const warnings = attempt?.status === 'PARTIAL' ? attempt.payload.warnings : null
  const reason = attempt?.status === 'INVALID' || attempt?.status === 'UNAVAILABLE' ? attempt.payload.reason : null

  const handleRetry = async () => {
    try {
      await triggerValidation(sessionId)
    } catch {
      showToast('Failed to start validation. Please try again.')
    }
  }

  const handleNext = async () => {
    if (status !== 'VALID' && status !== 'PARTIAL') {
      showToast('Please complete validation before continuing.')
      return
    }

    try {
      await advanceToReview(sessionId)
      onNext()
    } catch {
      showToast('Failed to advance to Review. Please try again.')
    }
  }

  return { status, items, warnings, reason, handleRetry, handleNext }
}
