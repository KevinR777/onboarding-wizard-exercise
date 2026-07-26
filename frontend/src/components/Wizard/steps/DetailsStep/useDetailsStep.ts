import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useParams } from 'react-router'
import { useToast } from '../../../Toast/useToast'
import { useSubmitDetails } from '../../../../services/useSubmitDetails'
import { useGetSession } from '../../../../services/useGetSession'

export type UseDetailsStepProps = {
  onNext: () => void
}

export const useDetailsStep = ({ onNext }: UseDetailsStepProps) => {
  const { sessionId } = useParams() as { sessionId: string }
  const { showToast } = useToast()
  const { submitDetails } = useSubmitDetails()
  const { session } = useGetSession(sessionId)
  const [companyName, setCompanyName] = useState('')
  const [providerAccountId, setProviderAccountId] = useState('')
  const [providerApiKey, setProviderApiKey] = useState('')

  const hasSeededRef = useRef(false)

  useEffect(() => {
    if (!session || hasSeededRef.current) return
    hasSeededRef.current = true
    setCompanyName(session.companyName ?? '')
    setProviderAccountId(session.providerAccountId ?? '')
    setProviderApiKey(session.providerApiKey ?? '')
  }, [session])

  const isValid =
    companyName.trim() !== '' && providerAccountId.trim() !== '' && providerApiKey.trim() !== ''

  const handleCompanyNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCompanyName(event.target.value)
  }

  const handleProviderAccountIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProviderAccountId(event.target.value)
  }

  const handleProviderApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProviderApiKey(event.target.value)
  }

  const handleNext = async () => {
    if (!isValid) {
      showToast('Please fill in all fields before continuing.')
      return
    }

    try {
      await submitDetails({ sessionId, companyName, providerAccountId, providerApiKey })
      onNext()
    } catch {
      showToast('Failed to save details. Please try again.')
    }
  }

  return {
    companyName,
    providerAccountId,
    providerApiKey,
    handleCompanyNameChange,
    handleProviderAccountIdChange,
    handleProviderApiKeyChange,
    isValid,
    handleNext,
  }
}
