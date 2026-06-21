import { useEffect, useMemo, useState } from 'react'
import type { PitchDetail, Session, VerdictStatus } from '../types'
import type { Voice } from '../types'
import { fetchPitchDetail, fetchVoices, submitVerdict, audioUrl, isDemo } from '../api'
import { DEMO_PITCHES, DEMO_PITCH_DETAILS, DEMO_VOICES } from '../demo'
import { AudioPlayer } from '../components/AudioPlayer'
import { VerdictStrip } from '../components/VerdictStrip'

const VOICE_KEY = 'lemon_voice'

interface Props {
  projectId: string
  sessionId: string
  sessions: Session[]
  onBack: () => void
  onVerdictRecorded: (projectId: string, verdict: VerdictStatus) => void
  onNavigatePitch: (projectId: string) => void
}

export function PitchDetailScreen({
  projectId,
  sessionId,
  sessions,
  onBack,
  onVerdictRecorded,
  onNavigatePitch,
}: Props) {
  const [detail, setDetail] = useState<PitchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem(VOICE_KEY) ?? '')

  const session = sessions.find(s => s.id === sessionId)
  const sessionPitchIds = isDemo ? DEMO_PITCHES.map(p => p.projectId) : (session?.pitchIds ?? [])
  const posIndex = sessionPitchIds.indexOf(projectId)
  const position = posIndex + 1
  const total = sessionPitchIds.length

  const currentVerdict: VerdictStatus = isDemo
    ? DEMO_PITCHES.find(p => p.projectId === projectId)?.verdictStatus ?? null
    : (session?.verdicts[projectId] ?? null)

  const nextPitchId = useMemo(() => {
    const pending = sessionPitchIds.filter(id => id !== projectId && !session?.verdicts[id])
    return pending[0] ?? null
  }, [sessionPitchIds, projectId, session])

  // Load voices once
  useEffect(() => {
    if (isDemo) {
      setVoices(DEMO_VOICES)
      return
    }
    fetchVoices()
      .then(v => {
        setVoices(v)
        // Auto-select first voice if none stored
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

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleVerdict = async (v: Exclude<VerdictStatus, null>) => {
    if (isDemo) {
      showToast('Demo mode — not saved')
      onVerdictRecorded(projectId, v)
      if (autoAdvance) advanceToNext(v)
      return
    }

    setSubmitting(true)
    try {
      await submitVerdict(projectId, v)
      onVerdictRecorded(projectId, v)
      if (autoAdvance) advanceToNext(v)
    } catch {
      showToast('Failed to submit — try again')
    } finally {
      setSubmitting(false)
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

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span className="topbar-title" style={{ fontSize: 13 }}>
          {loading ? 'Loading…' : (detail?.title ?? 'Pitch')}
        </span>
        {total > 0 && (
          <span className="pitch-position">{position} / {total}</span>
        )}
      </div>

      <AudioPlayer projectId={projectId} voiceId={selectedVoice || undefined} autoPlay />

      {/* Voice picker */}
      {voices.length > 0 && (
        <div className="voice-picker">
          <span className="voice-picker-label">Voice</span>
          {voices.map(v => (
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
          <div className="pitch-detail-meta">
            <span className="pill" style={{ background: 'var(--bg3)', color: 'var(--text-muted)' }}>
              {detail.format}
            </span>
            {detail.platform && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detail.platform}</span>
            )}
            {detail.genre && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detail.genre}</span>
            )}
          </div>
        </div>
      )}

      <div className="pitch-detail-body">
        <div className="scroll-area">
          {loading && <div className="empty-state">Loading pitch…</div>}
          {!loading && detail && (
            <div className="synopsis">{detail.cleanScript || detail.logline || 'No synopsis available.'}</div>
          )}
        </div>

        <VerdictStrip
          verdict={currentVerdict}
          submitting={submitting}
          onSubmit={handleVerdict}
        />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
