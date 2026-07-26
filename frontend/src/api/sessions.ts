import type { WizardStep } from '../types'

export type Session = {
  id: string
  currentStep: WizardStep
  companyName: string | null
  providerAccountId: string | null
  providerApiKey: string | null
  isLive: boolean
  createdAt: string
  updatedAt: string
}

export const createSession = async (): Promise<Session> => {
  const res = await fetch('http://localhost:4000/sessions', { method: 'POST' })
  if (!res.ok) {
    throw new Error('Failed to create session')
  }
  return res.json()
}

export type SubmitDetailsInput = {
  companyName: string
  providerAccountId: string
  providerApiKey: string
}

export const submitDetails = async (sessionId: string, input: SubmitDetailsInput): Promise<Session> => {
  const res = await fetch(`http://localhost:4000/sessions/${sessionId}/details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error('Failed to submit details')
  }
  return res.json()
}

export const getSession = async (sessionId: string): Promise<Session | null> => {
  const res = await fetch(`http://localhost:4000/sessions/${sessionId}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error('Failed to fetch session')
  }
  return res.json()
}

type Item = { id: string; name: string }

export type ValidPayload = { items: Item[] }
export type PartialPayload = { items: Item[]; warnings: string[] }
export type InvalidPayload = { reason: string }
export type UnavailablePayload = { reason: string; httpStatus: number }

type BaseAttempt = { id: string; sessionId: string; createdAt: string; updatedAt: string }

export type ValidationAttempt =
  | (BaseAttempt & { status: 'PENDING'; payload: null })
  | (BaseAttempt & { status: 'VALID'; payload: ValidPayload })
  | (BaseAttempt & { status: 'PARTIAL'; payload: PartialPayload })
  | (BaseAttempt & { status: 'INVALID'; payload: InvalidPayload })
  | (BaseAttempt & { status: 'UNAVAILABLE'; payload: UnavailablePayload })

export const triggerValidation = async (sessionId: string): Promise<ValidationAttempt> => {
  const res = await fetch(`http://localhost:4000/sessions/${sessionId}/validate`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('Failed to trigger validation')
  }
  return res.json()
}

export const getValidationAttempt = async (sessionId: string): Promise<{ attempt: ValidationAttempt | null }> => {
  const res = await fetch(`http://localhost:4000/sessions/${sessionId}/validation`)
  if (!res.ok) {
    throw new Error('Failed to fetch validation attempt')
  }
  return res.json()
}

export const advanceToReview = async (sessionId: string): Promise<Session> => {
  const res = await fetch(`http://localhost:4000/sessions/${sessionId}/advance-to-review`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('Failed to advance to Review')
  }
  return res.json()
}

export const goLive = async (sessionId: string): Promise<Session> => {
  const res = await fetch(`http://localhost:4000/sessions/${sessionId}/go-live`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('Failed to go live')
  }
  return res.json()
}
