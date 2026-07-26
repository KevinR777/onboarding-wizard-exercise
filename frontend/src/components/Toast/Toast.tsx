import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import type { AlertColor } from '@mui/material/Alert'

export type ToastProps = {
  open: boolean
  message: string
  severity: AlertColor
  onClose: () => void
}

export const Toast = ({ open, message, severity, onClose }: ToastProps) => (
  <Snackbar open={open} autoHideDuration={5000} onClose={onClose}>
    <Alert severity={severity} onClose={onClose} data-testid="toast-alert">
      {message}
    </Alert>
  </Snackbar>
)
