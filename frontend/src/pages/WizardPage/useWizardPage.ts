import { useParams } from 'react-router'

export const useWizardPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  return { sessionId }
}
