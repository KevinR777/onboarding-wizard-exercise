import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { WizardStep } from '../../types'
import { useGetSession } from '../../services/useGetSession'

export const WIZARD_STEP_ORDER: WizardStep[] = ['DETAILS', 'VALIDATE', 'REVIEW']

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  DETAILS: 'Details',
  VALIDATE: 'Validate',
  REVIEW: 'Review',
}

export const useWizard = () => {
  const { sessionId } = useParams() as { sessionId: string }
  const navigate = useNavigate()
  const { session, isLoading } = useGetSession(sessionId)

  const [currentStep, setCurrentStep] = useState<WizardStep | null>(null)

  useEffect(() => {
    if (session === undefined) return // still loading — no answer yet, nothing to decide
    if (session === null) {
      navigate('/') // confirmed not found
      return
    }
    setCurrentStep((current) => current ?? session.currentStep)
  }, [session, navigate])

  const activeStepIndex = currentStep ? WIZARD_STEP_ORDER.indexOf(currentStep) : 0

  const goNext = () => {
    if (!currentStep) return
    const next = WIZARD_STEP_ORDER[WIZARD_STEP_ORDER.indexOf(currentStep) + 1]
    if (next) setCurrentStep(next)
  }

  const goHome = () => navigate('/')

  return {
    isLoading: isLoading || !currentStep,
    isLive: session?.isLive ?? false,
    currentStep,
    activeStepIndex,
    goNext,
    goHome,
  }
}
