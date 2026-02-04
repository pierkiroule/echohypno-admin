import { useEffect, useState } from 'react';
import { supabase } from './supabase/client';

type EmojiMedia = {
  id: number;
  emoji: string;
  media_path: string;
  role: string;
  intensity: number;
  enabled: boolean;
};

export default function App() {
  const [rows, setRows] = useState<EmojiMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('emoji_media')
      .select('*')
      .order('emoji', { ascending: true });

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setRows(data || []);
      setError(null);
    }
    setLoading(false);
  };

  const updateRow = async (
    id: number,
    patch: Partial<EmojiMedia>
  ) => {
    setSavingId(id);

    const { error } = await supabase
      .from('emoji_media')
      .update(patch)
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Erreur sauvegarde');
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    }

    setSavingId(null);
  };

  if (loading) return <div>Chargement…</div>;
  if (error) return <div style={{ color: 'red' }}>Erreur : {error}</div>;

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Resonance Admin</h1>
      <p>Paramétrage fin des résonances emoji → médias</p>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14
        }}
      >
        <thead>
          <tr>
            <th>Emoji</th>
            <th>Media</th>
            <th>Role</th>
            <th>Intensity</th>
            <th>Enabled</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderTop: '1px solid #ddd' }}>
              <td>{row.emoji}</td>
              <td style={{ maxWidth: 300, fontSize: 12 }}>
                {row.media_path}
              </td>
              <td>{row.role}</td>
              <td>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={row.intensity}
                  onChange={(e) =>
                    updateRow(row.id, {
                      intensity: Number(e.target.value)
                    })
                  }
                  disabled={savingId === row.id}
                />
                <span style={{ marginLeft: 8 }}>
                  {row.intensity}
                </span>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) =>
                    updateRow(row.id, { enabled: e.target.checked })
                  }
                  disabled={savingId === row.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
