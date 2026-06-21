import type { PitchSummary, PitchDetail, VerdictStatus, Voice, BackendStats } from './types'

export type { Voice, BackendStats }

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export const isDemo = !API_BASE || API_BASE === 'PLACEHOLDER'

export async function fetchPitches(): Promise<PitchSummary[]> {
  const res = await fetch(`${API_BASE}/pitches`)
  if (!res.ok) throw new Error(`Failed to fetch pitches: ${res.status}`)
  return res.json() as Promise<PitchSummary[]>
}

export async function fetchPitchDetail(projectId: string): Promise<PitchDetail> {
  const res = await fetch(`${API_BASE}/pitches/${projectId}`)
  if (!res.ok) throw new Error(`Failed to fetch pitch: ${res.status}`)
  return res.json() as Promise<PitchDetail>
}

export async function fetchVoices(): Promise<Voice[]> {
  const res = await fetch(`${API_BASE}/voices`)
  if (!res.ok) throw new Error(`Failed to fetch voices: ${res.status}`)
  return res.json() as Promise<Voice[]>
}

export async function fetchStats(): Promise<BackendStats> {
  const res = await fetch(`${API_BASE}/stats`)
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`)
  return res.json() as Promise<BackendStats>
}

export function audioUrl(projectId: string, voiceId?: string): string {
  const base = `${API_BASE}/pitches/${projectId}/audio`
  return voiceId ? `${base}?voice=${encodeURIComponent(voiceId)}` : base
}

export async function submitVerdict(projectId: string, verdict: Exclude<VerdictStatus, null>): Promise<void> {
  const res = await fetch(`${API_BASE}/pitches/${projectId}/verdict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verdict }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Verdict failed: ${res.status} ${text}`)
  }
}
