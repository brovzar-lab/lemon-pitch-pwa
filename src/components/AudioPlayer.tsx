import { useEffect, useRef, useState } from 'react'
import { audioUrl, isDemo } from '../api'

const SPEEDS = [1, 1.25, 1.5, 2, 0.75] as const
type Speed = typeof SPEEDS[number]

function nextSpd(s: Speed): Speed {
  const i = SPEEDS.indexOf(s)
  return SPEEDS[(i + 1) % SPEEDS.length]
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const RING_R   = 44
const RING_SIZE = 96
const CIRCUMFERENCE = 2 * Math.PI * RING_R

interface Props {
  projectId: string
  voiceId?: string
  autoPlay?: boolean
}

export function AudioPlayer({ projectId, voiceId, autoPlay = true }: Props) {
  const audioRef   = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying]         = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]       = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [speed, setSpeed]             = useState<Speed>(1)
  const [seeking, setSeeking]         = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = speed
  }, [speed])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    setLoading(true)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setError('')

    if (isDemo) {
      setLoading(false)
      return
    }

    audio.src = audioUrl(projectId, voiceId)
    audio.load()

    const onCanPlay = () => {
      setLoading(false)
      setDuration(audio.duration)
      if (autoPlay) audio.play().catch(() => setPlaying(false))
    }
    const onTimeUpdate    = () => { if (!seeking) setCurrentTime(audio.currentTime) }
    const onDurationChange = () => setDuration(audio.duration)
    const onPlay          = () => setPlaying(true)
    const onPause         = () => setPlaying(false)
    const onEnded         = () => setPlaying(false)
    const onError         = () => { setLoading(false); setError('Audio unavailable') }

    audio.addEventListener('canplay',         onCanPlay)
    audio.addEventListener('timeupdate',      onTimeUpdate)
    audio.addEventListener('durationchange',  onDurationChange)
    audio.addEventListener('play',            onPlay)
    audio.addEventListener('pause',           onPause)
    audio.addEventListener('ended',           onEnded)
    audio.addEventListener('error',           onError)

    return () => {
      audio.removeEventListener('canplay',         onCanPlay)
      audio.removeEventListener('timeupdate',      onTimeUpdate)
      audio.removeEventListener('durationchange',  onDurationChange)
      audio.removeEventListener('play',            onPlay)
      audio.removeEventListener('pause',           onPause)
      audio.removeEventListener('ended',           onEnded)
      audio.removeEventListener('error',           onError)
      audio.pause()
    }
  }, [projectId, voiceId, autoPlay])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || isDemo) return
    if (playing) audio.pause()
    else audio.play().catch(() => {})
  }

  const skip = (delta: number) => {
    const audio = audioRef.current
    if (!audio || isDemo) return
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + delta))
  }

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    setCurrentTime(t)
    if (audioRef.current) audioRef.current.currentTime = t
  }

  const progress = duration > 0 ? currentTime / duration : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className={`audio-player${playing ? ' audio-player--playing' : ''}`}>
      <audio ref={audioRef} preload="auto" />
      {playing && <div className="audio-scanline" />}

      <div className="audio-controls">
        {/* Skip back */}
        <button className="audio-btn skip-btn" onClick={() => skip(-15)} aria-label="Skip back 15s">
          <span className="skip-icon">↺</span>
          <span className="skip-num">15s</span>
        </button>

        {/* Ring + play button */}
        <div className="audio-ring-wrap">
          <svg
            className="audio-ring-svg"
            width={RING_SIZE}
            height={RING_SIZE}
            aria-hidden="true"
          >
            {/* Pulse ring — only shown when playing */}
            {playing && (
              <circle
                className="ring-pulse"
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R + 6}
              />
            )}

            {/* Track */}
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
              fill="none"
              stroke="var(--border)"
              strokeWidth="2"
            />

            {/* Progress arc */}
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              style={{
                transition: 'stroke-dashoffset 0.2s linear',
                filter: 'drop-shadow(0 0 4px var(--accent))',
              }}
            />
          </svg>

          <button
            className={`audio-play-btn${playing ? ' audio-play-btn--playing' : ''}`}
            onClick={togglePlay}
            disabled={loading || !!error || isDemo}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {loading && !isDemo ? '···' : playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* Skip forward + speed */}
        <div className="audio-skip-speed">
          <button className="audio-btn skip-btn" onClick={() => skip(30)} aria-label="Skip forward 30s">
            <span className="skip-icon">↻</span>
            <span className="skip-num">30s</span>
          </button>
          <button
            className="speed-badge"
            onClick={() => setSpeed(nextSpd(speed))}
            aria-label="Change playback speed"
          >
            {speed === 1 ? '1×' : `${speed}×`}
          </button>
        </div>
      </div>

      {/* Scrub slider */}
      <input
        type="range"
        className="audio-scrub"
        min={0}
        max={duration || 100}
        step={0.1}
        value={currentTime}
        onChange={handleScrubChange}
        onMouseDown={() => setSeeking(true)}
        onMouseUp={() => setSeeking(false)}
        onTouchStart={() => setSeeking(true)}
        onTouchEnd={() => setSeeking(false)}
        disabled={loading || !!error || isDemo || duration === 0}
        aria-label="Seek"
      />

      <div className="audio-times">
        <span className="audio-time">{formatTime(currentTime)}</span>
        {isDemo && <span className="audio-demo-note">Demo — no audio</span>}
        {error && <span className="audio-demo-note" style={{ color: 'var(--red)' }}>{error}</span>}
        <span className="audio-time">{formatTime(duration)}</span>
      </div>
    </div>
  )
}
