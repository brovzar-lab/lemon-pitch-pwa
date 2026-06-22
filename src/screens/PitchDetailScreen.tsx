import { useEffect, useMemo, useRef, useState } from 'react'
import type { PitchDetail, PitchSummary, Session, VerdictStatus } from '../types'
import type { Voice } from '../types'
import type { AudioPlayerHandle } from '../components/AudioPlayer'
import { fetchPitchDetail, fetchVoices, submitVerdict, undoVerdict, audioUrl, isDemo } from '../api'
import { DEMO_PITCHES, DEMO_PITCH_DETAILS, DEMO_VOICES } from '../demo'
import { AudioPlayer } from '../components/AudioPlayer'
import { VerdictStrip } from '../components/VerdictStrip'

const VOICE_KEY = 'lemon_voice'
const NOTE_KEY = (id: string) => `pitch-note-${id}`
const VERDICT_LABELS: Record<string, string> = { approve: 'Approved', vault: 'Vaulted', reject: 'Rejected' }

export type KeyboardAction = 'play' | 'approve' | 'vault' | 'reject' | 'prev' | 'next' | 'skip' | 'undo' | null

interface UndoState {
  projectId: string
  label: string
  countdown: number
}

interface Props {
  projectId: string
  sessionId: string
  sessions: Session[]
  pitches?: PitchSummary[]
  onBack: () => void
  onVerdictRecorded: (projectId: string, verdict: VerdictStatus) => void
  onNavigatePitch: (projectId: string) => void
  onSkip?: () => void
  pendingKeyboardAction?: KeyboardAction
  onKeyboardActionHandled?: () => void
  isDesktopCenter?: boolean
}

export function PitchDetailScreen({
  projectId,
  sessionId,
  sessions,
  pitches: _pitches,
  onBack,
  onVerdictRecorded,
  onNavigatePitch,
  onSkip,
  pendingKeyboardAction,
  onKeyboardActionHandled,
  isDesktopCenter = false,
}: Props) {
  const [detail, setDetail] = useState<PitchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem(VOICE_KEY) ?? '')
  const [voiceSearch, setVoiceSearch] = useState('')
  const [undoPending, setUndoPending] = useState<UndoState | null>(null)
  const [note, setNote] = useState<string>(() => localStorage.getItem(NOTE_KEY(projectId)) ?? '')
  const undoTimerRef = useRef<{ timeout: ReturnType<typeof setTimeout>; interval: ReturnType<typeof setInterval> } | null>(null)
  const audioRef = useRef<AudioPlayerHandle>(null)

  const session = sessions.find(s => s.id === sessionId)
  const sessionPitchIds = isDemo ? DEMO_PITCHES.map(p => p.projectId) : (session?.pitchIds ?? [])
  const posIndex = sessionPitchIds.indexOf(projectId)
  const position = posIndex + 1
  const total = sessionPitchIds.length

  const currentVerdict: VerdictStatus = session?.verdicts[projectId]
    ?? (isDemo ? DEMO_PITCHES.find(p => p.projectId === projectId)?.verdictStatus ?? null : null)

  const nextPitchId = useMemo(() => {
    const pending = sessionPitchIds.filter(id => id !== projectId && !session?.verdicts[id])
    return pending[0] ?? null
  }, [sessionPitchIds, projectId, session])

  // Clear undo timer on unmount
  useEffect(() => () => clearUndoTimer(), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset note when pitch changes
  useEffect(() => {
    setNote(localStorage.getItem(NOTE_KEY(projectId)) ?? '')
  }, [projectId])

  // Load voices once
  useEffect(() => {
    if (isDemo) {
      setVoices(DEMO_VOICES)
      return
    }
    fetchVoices()
      .then(v => {
        setVoices(v)
        if (!localStorage.getItem(VOICE_KEY) && v.length > 0) {
          setSelectedVoice(v[0].id)
          localStorage.setItem(VOICE_KEY, v[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setDetail(null)

    if (isDemo) {
      const fallback = DEMO_PITCHES.find(p => p.projectId === projectId)
      const demoDetail = DEMO_PITCH_DETAILS[projectId] ?? (fallback ? {
        ...fallback,
        cleanScript: 'Demo pitch script not available for this entry.',
        logline: '',
        platform: '',
        genre: '',
      } : null)
      setDetail(demoDetail as PitchDetail | null)
      setLoading(false)
      return
    }

    fetchPitchDetail(projectId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  // Handle keyboard actions
  useEffect(() => {
    if (!pendingKeyboardAction) return

    const handleAction = async () => {
      switch (pendingKeyboardAction) {
        case 'play':
          audioRef.current?.togglePlay()
          break
        case 'approve':
          await handleVerdict('approve')
          break
        case 'vault':
          await handleVerdict('vault')
          break
        case 'reject':
          await handleVerdict('reject')
          break
        case 'prev': {
          const prevId = sessionPitchIds[posIndex - 1] ?? null
          if (prevId) onNavigatePitch(prevId)
          break
        }
        case 'next': {
          const nextId = sessionPitchIds[posIndex + 1] ?? null
          if (nextId) onNavigatePitch(nextId)
          break
        }
        case 'skip':
          onSkip?.()
          break
        case 'undo':
          handleUndoRef.current()
          break
      }
    }

    handleAction().finally(() => onKeyboardActionHandled?.())
  }, [pendingKeyboardAction]) // eslint-disable-line react-hooks/exhaustive-deps

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current.timeout)
      clearInterval(undoTimerRef.current.interval)
      undoTimerRef.current = null
    }
  }

  const startUndoCountdown = (pid: string, label: string) => {
    clearUndoTimer()
    setUndoPending({ projectId: pid, label, countdown: 5 })
    const interval = setInterval(() => {
      setUndoPending(prev => prev ? { ...prev, countdown: prev.countdown - 1 } : null)
    }, 1000)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      undoTimerRef.current = null
      setUndoPending(null)
    }, 5000)
    undoTimerRef.current = { timeout, interval }
  }

  const handleUndo = async () => {
    if (!undoPending) return
    const { projectId: pid } = undoPending
    clearUndoTimer()
    setUndoPending(null)
    onVerdictRecorded(pid, null)
    if (!isDemo) {
      try { await undoVerdict(pid) } catch { showToast('Undo failed') }
    }
  }

  const handleUndoRef = useRef(handleUndo)
  handleUndoRef.current = handleUndo

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleVerdict = async (v: Exclude<VerdictStatus, null>) => {
    if (isDemo) {
      showToast('Demo mode — not saved')
      onVerdictRecorded(projectId, v)
      startUndoCountdown(projectId, VERDICT_LABELS[v])
      if (autoAdvance) advanceToNext(v);
      (document.activeElement as HTMLElement)?.blur()
      return
    }

    setSubmitting(true)
    try {
      await submitVerdict(projectId, v)
      onVerdictRecorded(projectId, v)
      startUndoCountdown(projectId, VERDICT_LABELS[v])
      if (autoAdvance) advanceToNext(v)
    } catch {
      showToast('Failed to submit — try again')
    } finally {
      setSubmitting(false);
      (document.activeElement as HTMLElement)?.blur()
    }
  }

  const advanceToNext = (justVerdicted: VerdictStatus) => {
    const pendingIds = sessionPitchIds.filter(id => {
      if (id === projectId) return false
      const v = session?.verdicts[id] ?? null
      return !v
    })
    if (pendingIds.length > 0) onNavigatePitch(pendingIds[0])
    void justVerdicted
  }

  const handleSelectVoice = (id: string) => {
    setSelectedVoice(id)
    localStorage.setItem(VOICE_KEY, id)
  }

  const handleNoteBlur = () => {
    if (note.trim()) localStorage.setItem(NOTE_KEY(projectId), note)
    else localStorage.removeItem(NOTE_KEY(projectId))
  }

  const filteredVoices = voiceSearch
    ? voices.filter(v => v.name.toLowerCase().includes(voiceSearch.toLowerCase()))
    : voices

  return (
    <div className="screen" style={{ position: 'relative' }}>
      {/* Hide topbar on desktop when PitchQueue provides navigation */}
      {!isDesktopCenter && (
        <div className="topbar">
          <button className="back-btn" onClick={onBack}>‹</button>
          <span className="topbar-title" style={{ fontSize: 13 }}>
            {loading ? 'Loading…' : (detail?.title ?? 'Pitch')}
          </span>
          {total > 0 && (
            <span className="pitch-position">{position} / {total}</span>
          )}
        </div>
      )}

      <AudioPlayer ref={audioRef} projectId={projectId} voiceId={selectedVoice || undefined} autoPlay />

      {/* Voice picker */}
      {voices.length > 0 && (
        <div className="voice-picker">
          <span className="voice-picker-label">Voice</span>
          <input
            className="voice-search"
            placeholder="Filter…"
            value={voiceSearch}
            onChange={e => setVoiceSearch(e.target.value)}
          />
          {filteredVoices.map(v => (
            <button
              key={v.id}
              className={`voice-chip${selectedVoice === v.id ? ' voice-chip--active' : ''}`}
              onClick={() => handleSelectVoice(v.id)}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      {/* Preload next pitch audio */}
      {nextPitchId && !isDemo && (
        <audio
          preload="auto"
          src={audioUrl(nextPitchId, selectedVoice || undefined)}
          style={{ display: 'none' }}
        />
      )}

      <div className="auto-advance-toggle">
        <span className="toggle-label">Auto-advance after verdict</span>
        <input
          type="checkbox"
          className="toggle-switch"
          checked={autoAdvance}
          onChange={e => setAutoAdvance(e.target.checked)}
        />
      </div>

      {!loading && detail && (
        <div className="pitch-detail-header">
          <div className="pitch-detail-title">{detail.title}</div>
          {detail.logline && (
            <p className="pitch-detail-logline">{detail.logline}</p>
          )}
          <div className="pitch-detail-meta">
            <span className="pill" style={{ background: 'var(--bg3)', color: 'var(--text-muted)' }}>
              {detail.format}
            </span>
            {detail.platform && (
              <span className="meta-chip">{detail.platform}</span>
            )}
            {detail.genre && (
              <span className="meta-chip">{detail.genre}</span>
            )}
          </div>
          {detail.comps && (
            <div className="pitch-comps">
              <span className="pitch-comps-label">COMPS</span>
              <span className="pitch-comps-text">{detail.comps}</span>
            </div>
          )}
        </div>
      )}

      <div className="pitch-detail-body">
        <div className="scroll-area">
          {loading && <div className="empty-state">Loading pitch…</div>}
          {!loading && detail && (
            <>
              <div className="synopsis">{detail.cleanScript || detail.logline || 'No synopsis available.'}</div>
              <textarea
                className="pitch-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Notes…"
                rows={2}
              />
            </>
          )}
        </div>

        <VerdictStrip
          verdict={currentVerdict}
          submitting={submitting}
          onSubmit={handleVerdict}
        />
        {onSkip && (
          <div className="skip-strip">
            <button className="skip-btn" onClick={onSkip}>Skip for now</button>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
      {undoPending && (
        <div className="undo-toast" onClick={handleUndo}>
          {undoPending.label} — <span className="undo-link">Undo?</span> ({undoPending.countdown}s)
        </div>
      )}
    </div>
  )
}
