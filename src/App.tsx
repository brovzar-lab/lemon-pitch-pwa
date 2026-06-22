import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Screen, PitchSummary, Session, VerdictStatus } from './types'
import type { KeyboardAction } from './screens/PitchDetailScreen'
import { isDemo, triggerRefresh } from './api'
import { useSessions } from './store'
import { HomeScreen } from './screens/HomeScreen'
import { SessionScreen } from './screens/SessionScreen'
import { PitchDetailScreen } from './screens/PitchDetailScreen'
import { CurationScreen } from './screens/CurationScreen'
import { VaultScreen } from './screens/VaultScreen'
import { Sidebar } from './components/Sidebar'
import { PitchQueue } from './components/PitchQueue'
import { StatsPanel } from './components/StatsPanel'
import { DEMO_PITCHES, DEMO_SESSIONS } from './demo'

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [currentPitches, setCurrentPitches] = useState<PitchSummary[]>([])
  const [keyboardAction, setKeyboardAction] = useState<KeyboardAction>(null)
  const [syncing, setSyncing] = useState(false)
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
  const [pendingCurationPitches, setPendingCurationPitches] = useState<PitchSummary[]>([])
  const { sessions, activeSession, activeSessionId, createSession, recordVerdict, renameSession } = useSessions()

  // Clear skippedIds when leaving the pitch screen
  useEffect(() => {
    if (screen.name !== 'pitch') {
      setSkippedIds(new Set())
    }
  }, [screen.name])

  const handleSync = useCallback(async (): Promise<{ synced: string; pitches: PitchSummary[] } | null> => {
    if (isDemo) return null
    setSyncing(true)
    try {
      return await triggerRefresh()
    } catch {
      return null
    } finally {
      setSyncing(false)
    }
  }, [])

  const currentSessionId = screen.name === 'session' ? screen.sessionId
    : screen.name === 'pitch' ? screen.sessionId
    : null

  // Resolve the current session object — check live store first so recorded verdicts are visible
  const currentSession: Session | null = useMemo(() => {
    if (!currentSessionId) return null
    return sessions.find(s => s.id === currentSessionId)
      ?? (isDemo ? DEMO_SESSIONS.find(s => s.id === currentSessionId) ?? null : null)
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
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

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
        case 's': case 'S':
          setKeyboardAction('skip')
          break
        case 'z': case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setKeyboardAction('undo')
          }
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

  // Navigate to curate screen before starting a session
  const handleStartSession = (pitches: PitchSummary[]) => {
    setPendingCurationPitches(pitches)
    setScreen({ name: 'curate' })
  }

  const handleCurationConfirm = (pitchIds: string[]) => {
    const selected = pendingCurationPitches.filter(p => pitchIds.includes(p.projectId))
    const id = createSession(
      selected.map(p => p.projectId),
      selected.map(p => ({ format: p.format })),
    )
    setCurrentPitches(selected)
    setScreen({ name: 'session', sessionId: id })
  }

  const handleCurationCancel = () => {
    setScreen({ name: 'home' })
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
    if (screen.name === 'pitch') {
      recordVerdict(screen.sessionId, projectId, verdict)
    }
  }

  const handleNavigatePitch = (projectId: string) => {
    if (screen.name === 'pitch') {
      setScreen({ name: 'pitch', sessionId: screen.sessionId, projectId })
    }
  }

  const handleSkip = useCallback((skippedProjectId: string) => {
    const newSkipped = new Set([...skippedIds, skippedProjectId])
    setSkippedIds(newSkipped)

    if (screen.name !== 'pitch') return
    const session = sessions.find(s => s.id === (screen as { sessionId: string }).sessionId)
    const pitchIds = session?.pitchIds ?? []
    const nextId = pitchIds.find(id =>
      id !== skippedProjectId &&
      !newSkipped.has(id) &&
      !(session?.verdicts[id])
    )
    if (nextId) {
      setScreen({ name: 'pitch', sessionId: (screen as { sessionId: string }).sessionId, projectId: nextId })
    }
  }, [skippedIds, screen, sessions])

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
          skippedIds={skippedIds}
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
          onRefresh={handleSync}
          onVaultOpen={() => setScreen({ name: 'vault' })}
          onRenameSession={renameSession}
          syncing={syncing}
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
            syncing={syncing}
            onSync={handleSync}
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
            onSkip={() => {
              if (screen.name === 'pitch') handleSkip(screen.projectId)
            }}
            pendingKeyboardAction={keyboardAction}
            onKeyboardActionHandled={() => setKeyboardAction(null)}
            isDesktopCenter={true}
          />
        )}

        {screen.name === 'curate' && (
          <CurationScreen
            pitches={pendingCurationPitches}
            onStart={handleCurationConfirm}
            onCancel={handleCurationCancel}
          />
        )}

        {screen.name === 'vault' && (
          <VaultScreen onBack={() => setScreen({ name: 'home' })} />
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
