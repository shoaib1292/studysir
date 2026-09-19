'use client'

// Orchestrator for EVERY logged-out screen (Task 19-b): public landing, referral
// invite (?ref=CODE) and the login/signup form. Owning ?ref= persistence here
// means the affiliate code is saved no matter which screen the visitor sees first.

import { useEffect, useState } from 'react'
import { LandingView } from './LandingView'
import { ReferralLanding } from './ReferralLanding'
import { LoginScreen } from './LoginScreen'

type Screen =
  | { kind: 'landing' }
  | { kind: 'referral'; code: string }
  | { kind: 'auth'; mode: 'login' | 'signup' }

const REF_PATTERN = /^[A-Za-z0-9-]{2,20}$/

export function LoggedOutExperience() {
  const [screen, setScreen] = useState<Screen>({ kind: 'landing' })
  const [booting, setBooting] = useState(true)

  // First mount: capture ?ref=CODE from the affiliate link (persisted for the
  // later plan purchase), route to the invite page, then leave the splash.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref && REF_PATTERN.test(ref)) {
      const code = ref.toUpperCase()
      try {
        localStorage.setItem('ss_ref', code)
      } catch {
        // private browsing — attribution is best-effort
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScreen({ kind: 'referral', code })
    }
    setBooting(false)
  }, [])

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="animate-pulse font-logo text-4xl font-extrabold tracking-tight text-[#1877F2]">StudySir</p>
      </div>
    )
  }

  if (screen.kind === 'landing') {
    return (
      <LandingView
        onLogin={() => setScreen({ kind: 'auth', mode: 'login' })}
        onSignup={() => setScreen({ kind: 'auth', mode: 'signup' })}
      />
    )
  }

  if (screen.kind === 'referral') {
    return (
      <ReferralLanding
        code={screen.code}
        onLogin={() => setScreen({ kind: 'auth', mode: 'login' })}
        onSignup={() => setScreen({ kind: 'auth', mode: 'signup' })}
      />
    )
  }

  return <LoginScreen initialMode={screen.mode} onBack={() => setScreen({ kind: 'landing' })} />
}
