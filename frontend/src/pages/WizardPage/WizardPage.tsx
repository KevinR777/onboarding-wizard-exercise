import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { useWizardPage } from './useWizardPage'
import { Wizard } from '../../components/Wizard/Wizard'

export const WizardPage = () => {
  const { sessionId } = useWizardPage()

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Onboarding Wizard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Session ID: {sessionId}
      </Typography>
      <Wizard />
    </Container>
  )
}
