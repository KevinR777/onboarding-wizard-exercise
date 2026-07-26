import type { ReactNode } from 'react'
import { ToastContext } from './ToastContext'
import { useToastProvider } from './useToastProvider'
import { Toast } from './Toast'

export type ToastProviderProps = {
  children: ReactNode
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const { open, message, severity, showToast, handleClose } = useToastProvider()

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast open={open} message={message} severity={severity} onClose={handleClose} />
    </ToastContext.Provider>
  )
}
