import { useEffect, useState } from 'react';
import { supabase } from './supabase/client';

type EmojiMedia = {
  emoji: string;
  media_path: string;
  role: string;
  intensity: number;
  enabled: boolean;
};

export default function App() {
  const [rows, setRows] = useState<EmojiMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('emoji_media')
      .select('*')
      .order('emoji')
      .then(({ data, error }) => {
        if (error) console.error(error);
        setRows(data || []);
        setLoading(false);
      });
  }, []);

  const updateRow = (
    index: number,
    field: keyof EmojiMedia,
    value: any
  ) => {
    setRows(prev =>
      prev.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      )
    );
  };

  const saveAll = async () => {
    setSaving(true);

    const payload = rows.map(r => ({
      emoji: r.emoji,
      media_path: r.media_path,
      role: r.role,
      intensity: Number(r.intensity),
      enabled: Boolean(r.enabled)
    }));

    const { error } = await supabase
      .from('emoji_media')
      .upsert(payload, {
        onConflict: 'emoji,media_path'
      });

    if (error) {
      console.error(error);
      alert('Erreur sauvegarde');
    } else {
      alert('Résonances sauvegardées');
    }

    setSaving(false);
  };

  if (loading) return <div>Chargement…</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Resonance Admin</h2>

      <button onClick={saveAll} disabled={saving}>
        {saving ? 'Sauvegarde…' : 'Sauvegarder'}
      </button>

      <table border={1} cellPadding={6} style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Emoji</th>
            <th>Média</th>
            <th>Rôle</th>
            <th>Intensité</th>
            <th>Actif</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.emoji}-${r.media_path}`}>
              <td>{r.emoji}</td>
              <td>{r.media_path}</td>
              <td>{r.role}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={r.intensity}
                  onChange={e =>
                    updateRow(i, 'intensity', e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={e =>
                    updateRow(i, 'enabled', e.target.checked)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}