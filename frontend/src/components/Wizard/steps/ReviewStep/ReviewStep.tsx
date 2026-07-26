import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Container from '@mui/material/Container'
import Button from '@mui/material/Button'
import { useReviewStep } from './useReviewStep'

export const ReviewStep = () => {
  const { companyName, status, items, warnings, handleGoLive } = useReviewStep()

  return (
    <Stack spacing={2} data-testid="review-step">
      <Typography variant="h6">{companyName}</Typography>
      <Typography data-testid="review-status">Validation status: {status}</Typography>
      {items && (
        <List data-testid="review-items">
          {items.map((item) => (
            <ListItem key={item.id}>{item.name}</ListItem>
          ))}
        </List>
      )}
      {warnings && warnings.length > 0 && (
        <Stack data-testid="review-warnings">
          <Typography>Warnings:</Typography>
          <List>
            {warnings.map((warning) => (
              <ListItem key={warning}>{warning}</ListItem>
            ))}
          </List>
        </Stack>
      )}
      <Container sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleGoLive} data-testid="review-go-live-button">
          Go Live
        </Button>
      </Container>
    </Stack>
  )
}
