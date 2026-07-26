import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { useLandingPage } from './useLandingPage'

export const LandingPage = () => {
  const { isPending, isError, onStart } = useLandingPage()

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Partner Onboarding
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Connect your provider account to get started.
      </Typography>
      <Button variant="contained" loading={isPending} onClick={onStart}>
        Start Onboarding
      </Button>
      {isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Something went wrong starting onboarding. Please try again.
        </Alert>
      )}
    </Container>
  )
}
