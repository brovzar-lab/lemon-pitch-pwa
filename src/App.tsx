import { useEffect, useMemo, useState } from 'react'
import type { Screen, PitchSummary, Session, VerdictStatus } from './types'
import type { KeyboardAction } from './screens/PitchDetailScreen'
import { isDemo } from './api'
import { useSessions } from './store'
import { HomeScreen } from './screens/HomeScreen'
import { SessionScreen } from './screens/SessionScreen'
import { PitchDetailScreen } from './screens/PitchDetailScreen'
import { Sidebar } from './components/Sidebar'
import { PitchQueue } from './components/PitchQueue'
import { StatsPanel } from './components/StatsPanel'
import { DEMO_PITCHES, DEMO_SESSIONS } from './demo'

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [currentPitches, setCurrentPitches] = useState<PitchSummary[]>([])
  const [keyboardAction, setKeyboardAction] = useState<KeyboardAction>(null)
  const { sessions, activeSession, activeSessionId, createSession, recordVerdict } = useSessions()

  const currentSessionId = screen.name === 'session' ? screen.sessionId
    : screen.name === 'pitch' ? screen.sessionId
    : null

  // Resolve the current session object
  const currentSession: Session | null = useMemo(() => {
    if (!currentSessionId) return null
    if (isDemo) return DEMO_SESSIONS.find(s => s.id === currentSessionId) ?? null
    return sessions.find(s => s.id === currentSessionId) ?? null
  }, [currentSessionId, sessions])

  // In demo mode, auto-populate pitches when entering a session or pitch screen
  useEffect(() => {
    if (!isDemo) return
    if (!currentSessionId) { setCurrentPitches([]); return }
    const demoSession = DEMO_SESSIONS.find(s => s.id === currentSessionId)
    setCurrentPitches(demoSession ? DEMO_PITCHES.filter(p => demoSession.pitchIds.includes(p.projectId)) : [])
  }, [currentSessionId])

  // Merge live verdicts into pitches for panel display
  const pitchesForPanels = useMemo(() => {
    const verdicts = currentSession?.verdicts ?? {}
    return currentPitches.map(p => ({
      ...p,
      verdictStatus: verdicts[p.projectId] ?? p.verdictStatus,
    }))
  }, [currentPitches, currentSession])

  // Global keyboard shortcuts — active on pitch screen only
  useEffect(() => {
    if (screen.name !== 'pitch') return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT' || tag === 'TEXTAREA') return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          setKeyboardAction('play')
          break
        case 'a': case 'A':
          setKeyboardAction('approve')
          break
        case 'v': case 'V':
          setKeyboardAction('vault')
          break
        case 'r': case 'R':
          setKeyboardAction('reject')
          break
        case 'ArrowLeft':
          e.preventDefault()
          setKeyboardAction('prev')
          break
        case 'ArrowRight':
          e.preventDefault()
          setKeyboardAction('next')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screen.name])

  const handleStartSession = (pitches: PitchSummary[]) => {
    const id = createSession(
      pitches.map(p => p.projectId),
      pitches.map(p => ({ format: p.format })),
    )
    setCurrentPitches(pitches)
    setScreen({ name: 'session', sessionId: id })
  }

  const handleSelectSession = (sessionId: string) => {
    setScreen({ name: 'session', sessionId })
  }

  const handleSelectPitch = (projectId: string) => {
    if (screen.name === 'session') {
      setScreen({ name: 'pitch', sessionId: screen.sessionId, projectId })
    }
  }

  const handleVerdictRecorded = (projectId: string, verdict: VerdictStatus) => {
    if (screen.name === 'pitch' && !isDemo) {
      recordVerdict(screen.sessionId, projectId, verdict)
    }
  }

  const handleNavigatePitch = (projectId: string) => {
    if (screen.name === 'pitch') {
      setScreen({ name: 'pitch', sessionId: screen.sessionId, projectId })
    }
  }

  const isPitchScreen  = screen.name === 'pitch'
  const showStatsPanel = screen.name === 'pitch' || screen.name === 'session'

  return (
    <div className="app-shell">
      {isDemo && <div className="demo-badge">Demo</div>}

      {/* ── Left panel: PitchQueue on pitch screen, Sidebar otherwise ── */}
      {isPitchScreen ? (
        <PitchQueue
          pitches={pitchesForPanels}
          currentProjectId={screen.name === 'pitch' ? screen.projectId : null}
          session={currentSession}
          onSelectPitch={handleNavigatePitch}
          onBackToSessions={() => {
            if (screen.name === 'pitch') setScreen({ name: 'session', sessionId: screen.sessionId })
          }}
        />
      ) : (
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onStartSession={handleStartSession}
          isHome={screen.name === 'home'}
        />
      )}

      {/* ── Main content panel ── */}
      <div className="main-panel">
        {screen.name === 'home' && (
          <HomeScreen
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onStartSession={handleStartSession}
          />
        )}

        {screen.name === 'session' && (
          <SessionScreen
            sessionId={screen.sessionId}
            sessions={sessions}
            onBack={() => setScreen({ name: 'home' })}
            onSelectPitch={handleSelectPitch}
            onPitchesLoaded={setCurrentPitches}
          />
        )}

        {screen.name === 'pitch' && (
          <PitchDetailScreen
            projectId={screen.projectId}
            sessionId={screen.sessionId}
            sessions={sessions}
            pitches={pitchesForPanels}
            onBack={() => {
              if (screen.name === 'pitch') {
                setScreen({ name: 'session', sessionId: screen.sessionId })
              }
            }}
            onVerdictRecorded={handleVerdictRecorded}
            onNavigatePitch={handleNavigatePitch}
            pendingKeyboardAction={keyboardAction}
            onKeyboardActionHandled={() => setKeyboardAction(null)}
            isDesktopCenter={true}
          />
        )}
      </div>

      {/* ── Right panel: StatsPanel on pitch/session screens ── */}
      {showStatsPanel && (
        <StatsPanel session={currentSession} pitches={pitchesForPanels} />
      )}

      {activeSession && <span style={{ display: 'none' }}>{activeSession.id}</span>}
    </div>
  )
}
