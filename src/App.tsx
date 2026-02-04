import { useEffect, useState } from 'react'
import { supabase } from './supabase/client'

type EmojiMediaRow = {
  emoji: string
  media_path: string
  role: string
  intensity: number
  enabled: boolean
}

export default function App() {
  const [rows, setRows] = useState<EmojiMediaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ---------- LOAD ---------- */

  const load = async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('emoji_media')
      .select('*')
      .order('emoji', { ascending: true })
      .order('role', { ascending: true })

    if (error) {
      console.error(error)
      setError(error.message)
    } else {
      setRows(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  /* ---------- UPDATE ---------- */

  const updateRow = async (
    row: EmojiMediaRow,
    patch: Partial<EmojiMediaRow>
  ) => {
    // optimistic update
    setRows(prev =>
      prev.map(r =>
        r.emoji === row.emoji && r.media_path === row.media_path
          ? { ...r, ...patch }
          : r
      )
    )

    const { error } = await supabase
      .from('emoji_media')
      .update(patch)
      .eq('emoji', row.emoji)
      .eq('media_path', row.media_path)

    if (error) {
      console.error(error)
      load() // rollback
    }
  }

  /* ---------- GROUP BY EMOJI ---------- */

  const grouped = rows.reduce<Record<string, EmojiMediaRow[]>>((acc, row) => {
    if (!acc[row.emoji]) acc[row.emoji] = []
    acc[row.emoji].push(row)
    return acc
  }, {})

  /* ---------- RENDER ---------- */

  if (loading) return <div style={{ padding: 16 }}>Chargement…</div>

  if (error)
    return (
      <div style={{ padding: 16, color: 'red' }}>
        Erreur Supabase : {error}
      </div>
    )

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>EchoHypno — Resonance Admin</h1>
      <p>Table : <code>emoji_media</code></p>

      {Object.entries(grouped).map(([emoji, items]) => (
        <div
          key={emoji}
          style={{
            marginBottom: 24,
            padding: 12,
            border: '1px solid #333',
            borderRadius: 8
          }}
        >
          <h2 style={{ fontSize: 28 }}>{emoji}</h2>

          {items.map(row => (
            <div
              key={row.media_path}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 60px 140px',
                gap: 8,
                alignItems: 'center',
                padding: '6px 0'
              }}
            >
              {/* role */}
              <div style={{ opacity: 0.7 }}>{row.role}</div>

              {/* media */}
              <div style={{ fontSize: 12 }}>
                {row.media_path}
              </div>

              {/* enabled */}
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={e =>
                  updateRow(row, { enabled: e.target.checked })
                }
              />

              {/* intensity */}
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={row.intensity}
                onChange={e =>
                  updateRow(row, { intensity: Number(e.target.value) })
                }
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}