import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Container from '@mui/material/Container'
import Button from '@mui/material/Button'
import { useValidateStep } from './useValidateStep'

export type ValidateStepProps = {
  onNext: () => void
}

export const ValidateStep = ({ onNext }: ValidateStepProps) => {
  const { status, items, warnings, reason, handleRetry, handleNext } = useValidateStep({ onNext })

  return (
    <Stack spacing={3} data-testid="validate-step">
      {status === 'PENDING' && (
        <Alert severity="info" icon={<CircularProgress size={20} />} data-testid="validate-status-alert">
          Validating...
        </Alert>
      )}
      {status === 'VALID' && (
        <Alert severity="success" data-testid="validate-status-alert">
          <AlertTitle>Validation successful</AlertTitle>
          Found {items?.length ?? 0} item(s): {items?.map((item) => item.name).join(', ')}
        </Alert>
      )}
      {status === 'PARTIAL' && (
        <Alert severity="warning" data-testid="validate-status-alert">
          <AlertTitle>Validation completed with warnings</AlertTitle>
          Found {items?.length ?? 0} item(s): {items?.map((item) => item.name).join(', ')}
          {warnings && warnings.length > 0 && <div>Warnings: {warnings.join(', ')}</div>}
        </Alert>
      )}
      {status === 'INVALID' && (
        <Alert severity="error" data-testid="validate-status-alert">
          <AlertTitle>Validation failed</AlertTitle>
          {reason}
        </Alert>
      )}
      {status === 'UNAVAILABLE' && (
        <Alert severity="info" data-testid="validate-status-alert">
          <AlertTitle>Provider unavailable</AlertTitle>
          This is usually temporary — it's safe to retry.
        </Alert>
      )}

      <Container sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="outlined" onClick={handleRetry} data-testid="validate-retry-button">
          Retry
        </Button>
      </Container>
      <Container sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleNext} data-testid="validate-next-button">
          Next
        </Button>
      </Container>
    </Stack>
  )
}
