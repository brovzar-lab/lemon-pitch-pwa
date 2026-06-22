import { useState } from 'react'
import type { PitchSummary } from '../types'

interface Props {
  pitches: PitchSummary[]
  onStart: (pitchIds: string[]) => void
  onCancel: () => void
}

export function CurationScreen({ pitches, onStart, onCancel }: Props) {
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  const toggleSkip = (id: string) => {
    setSkipped(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const active = pitches.filter(p => !skipped.has(p.projectId))

  const handleStart = () => {
    onStart(active.map(p => p.projectId))
  }

  return (
    <div className="curation-screen">
      <div className="curation-header">
        <span className="curation-title">Curate Session</span>
        <button className="curation-cancel" onClick={onCancel}>Cancel</button>
      </div>

      <div className="curation-body">
        <div className="curation-hint">Click any row to skip it from this session.</div>
        <table className="curation-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Format</th>
              <th>Genre</th>
            </tr>
          </thead>
          <tbody>
            {pitches.map(p => (
              <tr
                key={p.projectId}
                className={`curation-row${skipped.has(p.projectId) ? ' skipped' : ''}`}
                onClick={() => toggleSkip(p.projectId)}
              >
                <td className="curation-num">{p.pitchNumber}</td>
                <td className="curation-title-cell">{p.title}</td>
                <td className="curation-format">{p.format}</td>
                <td className="curation-genre">{p.genre ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="curation-footer">
        <button
          className="curation-cta"
          onClick={handleStart}
          disabled={active.length === 0}
        >
          Start Audio Session ({active.length} pitches)
        </button>
      </div>
    </div>
  )
}
