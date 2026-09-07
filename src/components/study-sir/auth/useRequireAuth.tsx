'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { LoginPromptDialog } from './LoginPromptDialog'

/**
 * Hook that provides auth-protected action handlers.
 * If user is not logged in, shows login dialog instead of executing the action.
 */
export function useRequireAuth() {
  const me = useAppStore((s) => s.me)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const requireAuth = useCallback((action: () => void) => {
    if (me) {
      // User is logged in, execute action immediately
      action()
    } else {
      // User is not logged in, show login dialog
      setPendingAction(() => action)
      setLoginPromptOpen(true)
    }
  }, [me])

  const handleLoginSuccess = useCallback(() => {
    setLoginPromptOpen(false)
    // Execute the pending action after successful login
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }, [pendingAction])

  const handleLoginClose = useCallback(() => {
    setLoginPromptOpen(false)
    setPendingAction(null)
  }, [])

  return {
    me,
    requireAuth,
    loginPromptOpen,
    handleLoginSuccess,
    handleLoginClose,
    LoginPromptDialog: (
      <LoginPromptDialog
        open={loginPromptOpen}
        onOpenChange={handleLoginClose}
        onSuccess={handleLoginSuccess}
      />
    ),
  }
}
