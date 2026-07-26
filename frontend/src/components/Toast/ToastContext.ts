import { createContext } from 'react'
import type { AlertColor } from '@mui/material/Alert'

export type ToastContextValue = {
  showToast: (message: string, severity?: AlertColor) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
