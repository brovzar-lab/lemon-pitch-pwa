import { useState, useCallback } from 'react'
import type { Session, VerdictStatus } from './types'

const SESSIONS_KEY = 'lemon_sessions'
const ACTIVE_SESSION_KEY = 'lemon_active_session'

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? (JSON.parse(raw) as Session[]) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: Session[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

function loadActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_KEY)
}

function saveActiveSessionId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id)
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY)
  }
}

function formatSessionName(pitchIds: string[], pitches: { format: string }[]): string {
  const films = pitches.filter(p => p.format?.toUpperCase() === 'FILM').length
  const series = pitches.filter(p => p.format?.toUpperCase() === 'SERIES').length
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const parts: string[] = []
  if (films > 0) parts.push(`${films} Film${films !== 1 ? 's' : ''}`)
  if (series > 0) parts.push(`${series} Series`)
  if (parts.length === 0) parts.push(`${pitchIds.length} Pitches`)
  return `Pitch Session · ${parts.join(' · ')} · ${date}`
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(loadActiveSessionId)

  const createSession = useCallback((pitchIds: string[], pitchFormats: { format: string }[]) => {
    const id = `session-${Date.now()}`
    const session: Session = {
      id,
      name: formatSessionName(pitchIds, pitchFormats),
      createdAt: new Date().toISOString(),
      pitchIds,
      verdicts: {},
    }
    const updated = [session, ...sessions]
    setSessions(updated)
    saveSessions(updated)
    setActiveSessionId(id)
    saveActiveSessionId(id)
    return id
  }, [sessions])

  const recordVerdict = useCallback((sessionId: string, projectId: string, verdict: VerdictStatus) => {
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === sessionId
          ? { ...s, verdicts: { ...s.verdicts, [projectId]: verdict } }
          : s
      )
      saveSessions(updated)
      return updated
    })
  }, [])

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null

  return { sessions, activeSession, activeSessionId, createSession, recordVerdict, setActiveSessionId }
}
