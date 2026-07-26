import { useNavigate } from 'react-router'
import { useCreateSession } from '../../services/useCreateSession'

export const useLandingPage = () => {
  const navigate = useNavigate()
  const { createSession, isPending, isError } = useCreateSession()

  const onStart = async () => {
    try {
      const session = await createSession()
      navigate(`/onboarding-wizard/${session.id}`)
    } catch {
      // No-op: isError from useCreateSession already flips true and drives
      // LandingPage's existing error Alert reactively. The empty catch exists
      // only so the rejected promise doesn't surface as an unhandled
      // rejection — there's nothing extra to *do* here beyond what the
      // existing render-time isError check already covers.
    }
  }

  return { isPending, isError, onStart }
}
