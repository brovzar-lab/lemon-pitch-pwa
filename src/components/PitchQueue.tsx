import { useState } from 'react'
import type { PitchSummary, Session, VerdictStatus } from '../types'

interface Props {
  pitches: PitchSummary[]
  currentProjectId: string | null
  session: Session | null
  skippedIds?: Set<string>
  onSelectPitch: (projectId: string) => void
  onBackToSessions: () => void
}

function verdictClass(v: VerdictStatus | undefined): string {
  if (v === 'approve') return 'approved'
  if (v === 'vault') return 'vaulted'
  if (v === 'reject') return 'rejected'
  return 'pending'
}

function verdictLabel(v: VerdictStatus | undefined): string {
  if (v === 'approve') return 'Approved'
  if (v === 'vault') return 'Vault'
  if (v === 'reject') return 'Rejected'
  return '—'
}

const GENRE_MAP: Record<string, string> = {
  'Comedy':                                'Comedy',
  'Dark Comedy':                           'Comedy',
  'Political Comedy':                      'Comedy',
  'Romantic Comedy':                       'Comedy',
  'Comedy/Drama':                          'Comedy-Drama',
  'Comedy-Drama':                          'Comedy-Drama',
  'Dark Comedy-Drama':                     'Comedy-Drama',
  'Drama/Family Saga':                     'Drama',
  'Prestige Drama':                        'Drama',
  'Prestige Drama/Psychological Thriller': 'Drama',
  'Prestige Drama/Supernatural':           'Drama',
  'Political Drama/Thriller':              'Drama',
  'Horror':                                'Horror',
  'Thriller':                              'Thriller',
  'Legal Thriller':                        'Thriller',
  'Political Thriller/Legal Thriller':     'Thriller',
  'Crime Procedural/Supernatural Thriller':'Crime',
}

function normalizeGenre(genre: string | undefined): string | undefined {
  if (!genre) return undefined
  return GENRE_MAP[genre] ?? genre
}

function formatLabel(format: string): string {
  if (format === 'FILM') return 'Film'
  if (format === 'SERIES') return 'TV Show'
  return format
}

export function PitchQueue({ pitches, currentProjectId, session, skippedIds, onSelectPitch, onBackToSessions }: Props) {
  const [formatFilter, setFormatFilter] = useState<string>('ALL')
  const [genreFilter, setGenreFilter] = useState<string>('ALL')

  const sorted = [...pitches].sort((a, b) => {
    const aVerdicted = !!(session?.verdicts[a.projectId] ?? a.verdictStatus)
    const bVerdicted = !!(session?.verdicts[b.projectId] ?? b.verdictStatus)
    const aSkipped = skippedIds?.has(a.projectId) ?? false
    const bSkipped = skippedIds?.has(b.projectId) ?? false
    // Verdicted last, then skipped, then pending by pitchNumber
    if (aVerdicted !== bVerdicted) return aVerdicted ? 1 : -1
    if (!aVerdicted && !bVerdicted && aSkipped !== bSkipped) return aSkipped ? 1 : -1
    return a.pitchNumber - b.pitchNumber
  })

  const formats = ['ALL', ...Array.from(new Set(sorted.map(p => p.format).filter((f): f is string => !!f))).sort()]
  const genres = ['ALL', ...Array.from(new Set(
    sorted.map(p => normalizeGenre(p.genre)).filter((g): g is string => !!g)
  )).sort()]
  const hasGenres = genres.length > 1

  const filtered = sorted.filter(p => {
    if (formatFilter !== 'ALL' && p.format !== formatFilter) return false
    if (genreFilter !== 'ALL' && normalizeGenre(p.genre) !== genreFilter) return false
    return true
  })

  const pending = filtered.filter(p => !(session?.verdicts[p.projectId] ?? p.verdictStatus)).length

  return (
    <div className="pitch-queue">
      <div className="pitch-queue-header">
        <button className="pitch-queue-back" onClick={onBackToSessions} aria-label="Back to sessions">‹</button>
        <div className="pitch-queue-session-name">{session?.name ?? 'Session'}</div>
      </div>

      <div className="pitch-queue-filters">
        <div className="pitch-queue-filter-row">
          {formats.map(fmt => {
            const count = fmt === 'ALL'
              ? sorted.filter(p => genreFilter === 'ALL' || normalizeGenre(p.genre) === genreFilter).length
              : sorted.filter(p => p.format === fmt && (genreFilter === 'ALL' || normalizeGenre(p.genre) === genreFilter)).length
            return (
              <button
                key={fmt}
                className={`pitch-queue-chip${formatFilter === fmt ? ' active' : ''}`}
                onClick={() => setFormatFilter(fmt)}
              >
                {fmt === 'ALL' ? 'All' : formatLabel(fmt)} ({count})
              </button>
            )
          })}
        </div>
        {hasGenres && (
          <div className="pitch-queue-filter-row">
            {genres.map(genre => {
              const count = genre === 'ALL'
                ? sorted.filter(p => formatFilter === 'ALL' || p.format === formatFilter).length
                : sorted.filter(p => normalizeGenre(p.genre) === genre && (formatFilter === 'ALL' || p.format === formatFilter)).length
              return (
                <button
                  key={genre}
                  className={`pitch-queue-chip${genreFilter === genre ? ' active' : ''}`}
                  onClick={() => setGenreFilter(genre)}
                >
                  {genre === 'ALL' ? 'All' : genre} ({count})
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="pitch-queue-list">
        {filtered.map(p => {
          const verdict = session?.verdicts[p.projectId] ?? p.verdictStatus
          const isActive = p.projectId === currentProjectId
          const isSkipped = skippedIds?.has(p.projectId) ?? false
          return (
            <div
              key={p.projectId}
              className={`pitch-queue-row${isActive ? ' active' : ''}${isSkipped ? ' skipped' : ''}`}
              onClick={() => onSelectPitch(p.projectId)}
            >
              <span className="pitch-queue-num">{p.pitchNumber}</span>
              <div className="pitch-queue-info">
                <div className="pitch-queue-title">{p.title}</div>
                <div className="pitch-queue-format">
                  {p.format}{isSkipped ? ' · SKIP' : ''}
                </div>
              </div>
              <span className={`pill ${verdictClass(verdict)}`}>{verdictLabel(verdict)}</span>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="pitch-queue-empty">No pitches</div>
        )}
      </div>

      <div className="pitch-queue-footer">
        <span>{filtered.length} shown</span>
        <span className="pitch-queue-footer-sep">·</span>
        <span className="pitch-queue-footer-pending">{pending} pending</span>
      </div>
    </div>
  )
}
