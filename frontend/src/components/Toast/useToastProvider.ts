import { useState } from 'react'
import type { AlertColor } from '@mui/material/Alert'

export const useToastProvider = () => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<AlertColor>('error')

  const showToast = (nextMessage: string, nextSeverity: AlertColor = 'error') => {
    setMessage(nextMessage)
    setSeverity(nextSeverity)
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  return { open, message, severity, showToast, handleClose }
}
