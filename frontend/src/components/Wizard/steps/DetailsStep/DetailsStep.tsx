import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { useDetailsStep } from './useDetailsStep'

export type DetailsStepProps = {
  onNext: () => void
}

export const DetailsStep = ({ onNext }: DetailsStepProps) => {
  const {
    companyName,
    providerAccountId,
    providerApiKey,
    handleCompanyNameChange,
    handleProviderAccountIdChange,
    handleProviderApiKeyChange,
    handleNext,
  } = useDetailsStep({ onNext })

  return (
    <Stack spacing={2}>
      <TextField
        label="Company Name"
        value={companyName}
        onChange={handleCompanyNameChange}
        fullWidth
        data-testid="details-company-name-input"
      />
      <TextField
        label="Account Id"
        value={providerAccountId}
        onChange={handleProviderAccountIdChange}
        fullWidth
        data-testid="details-account-id-input"
      />
      <TextField
        label="Api Key"
        value={providerApiKey}
        onChange={handleProviderApiKeyChange}
        fullWidth
        data-testid="details-api-key-input"
      />
      <Container sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleNext} data-testid="details-next-button">
          Next
        </Button>
      </Container>
    </Stack>
  )
}
