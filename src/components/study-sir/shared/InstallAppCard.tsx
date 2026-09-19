'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Download, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FbCard } from './bits'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Tracks the browser's PWA install signal (beforeinstallprompt) + standalone state. */
function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // deferred so we don't setState synchronously inside the effect (lint rule)
    const t = setTimeout(() => {
      const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        // iOS Safari
        (navigator as Navigator & { standalone?: boolean }).standalone === true
      if (standalone) setInstalled(true)
    }, 0)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
      toast.success('StudySir installed 🎉', { description: 'Launch it from your home screen.' })
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'dismissed') setDeferred(null)
  }, [deferred])

  return { canInstall: !!deferred, installed, install }
}

/** Settings card: install StudySir as a PWA (works when the browser allows it). */
export function InstallAppCard() {
  const { canInstall, installed, install } = useInstallPrompt()
  const [installing, setInstalling] = useState(false)

  return (
    <FbCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-[#1877F2] dark:text-blue-400">
          <Smartphone className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            Install StudySir
            {installed ? (
              <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-3" />
                Installed
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {installed
              ? 'You are using the installed app — full screen, offline-ready.'
              : canInstall
                ? 'Add StudySir to your home screen for a full-screen, offline-ready app.'
                : 'Use your browser menu → “Install app” / “Add to Home Screen” to install StudySir.'}
          </p>
        </div>
      </div>
      {canInstall && !installed ? (
        <Button
          className="shrink-0 gap-1.5 bg-[#1877F2] hover:bg-[#166FE5]"
          disabled={installing}
          onClick={async () => {
            setInstalling(true)
            try {
              await install()
            } finally {
              setInstalling(false)
            }
          }}
        >
          <Download className="size-4" />
          Install app
        </Button>
      ) : null}
    </FbCard>
  )
}
