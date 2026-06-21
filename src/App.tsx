import { useState } from 'react'
import type { Screen, PitchSummary, VerdictStatus } from './types'
import { isDemo } from './api'
import { useSessions } from './store'
import { HomeScreen } from './screens/HomeScreen'
import { SessionScreen } from './screens/SessionScreen'
import { PitchDetailScreen } from './screens/PitchDetailScreen'
import { Sidebar } from './components/Sidebar'

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const { sessions, activeSession, activeSessionId, createSession, recordVerdict } = useSessions()

  const handleStartSession = (pitches: PitchSummary[]) => {
    const id = createSession(
      pitches.map(p => p.projectId),
      pitches.map(p => ({ format: p.format })),
    )
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

  const currentSessionId = screen.name === 'session' ? screen.sessionId
    : screen.name === 'pitch' ? screen.sessionId
    : null

  return (
    <div className="app-shell">
      {isDemo && <div className="demo-badge">Demo</div>}

      {/* ── Desktop sidebar ── */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onStartSession={handleStartSession}
        isHome={screen.name === 'home'}
      />

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
          />
        )}

        {screen.name === 'pitch' && (
          <PitchDetailScreen
            projectId={screen.projectId}
            sessionId={screen.sessionId}
            sessions={sessions}
            onBack={() => {
              if (screen.name === 'pitch') {
                setScreen({ name: 'session', sessionId: screen.sessionId })
              }
            }}
            onVerdictRecorded={handleVerdictRecorded}
            onNavigatePitch={handleNavigatePitch}
          />
        )}
      </div>

      {activeSession && <span style={{ display: 'none' }}>{activeSession.id}</span>}
    </div>
  )
}
