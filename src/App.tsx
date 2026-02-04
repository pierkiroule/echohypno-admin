import { useEffect, useMemo } from "react";
import "./styles.css";
import { useResonanceStore } from "./store/resonanceStore";

export default function App() {
  const { rows, load, updateLocal, save, loading, error } =
    useResonanceStore();

  /* -------------------------------------------- */
  /* LOAD                                         */
  /* -------------------------------------------- */

  useEffect(() => {
    load();
  }, [load]);

  /* -------------------------------------------- */
  /* GROUP BY EMOJI                               */
  /* -------------------------------------------- */

  const grouped = useMemo(() => {
    const map: Record<string, typeof rows> = {};
    rows.forEach((r) => {
      if (!map[r.emoji]) map[r.emoji] = [];
      map[r.emoji].push(r);
    });
    return map;
  }, [rows]);

  /* -------------------------------------------- */
  /* STATES                                       */
  /* -------------------------------------------- */

  if (loading) {
    return <div className="loading">Chargement…</div>;
  }

  if (error) {
    return <div className="error">Erreur : {error}</div>;
  }

  /* -------------------------------------------- */
  /* RENDER                                       */
  /* -------------------------------------------- */

  return (
    <div className="app">
      <header className="header">
        <h1>EchoHypno – Admin Résonances</h1>
        <button className="save" onClick={save}>
          💾 Sauver
        </button>
      </header>

      {Object.entries(grouped).map(([emoji, items]) => (
        <details key={emoji} open className="emoji-block">
          <summary className="emoji-header">
            <span className="emoji">{emoji}</span>
            <span className="count">
              {items.filter((i) => i.enabled).length} / {items.length} actifs
            </span>
          </summary>

          <table className="media-table">
            <thead>
              <tr>
                <th>Actif</th>
                <th>Média</th>
                <th>Type</th>
                <th>Intensité</th>
              </tr>
            </thead>

            <tbody>
              {items.map((row) => (
                <tr
                  key={`${row.emoji}|${row.media_path}|${row.role}`}
                  className={!row.enabled ? "disabled" : ""}
                >
                  {/* ENABLE */}
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(row.enabled)}
                      onChange={(e) =>
                        updateLocal(
                          row.emoji,
                          row.media_path,
                          row.role,
                          { enabled: e.target.checked }
                        )
                      }
                    />
                  </td>

                  {/* PATH */}
                  <td className="path">{row.media_path}</td>

                  {/* ROLE */}
                  <td className="role">{row.role}</td>

                  {/* INTENSITY */}
                  <td className="intensity-cell">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={row.intensity}
                      onChange={(e) =>
                        updateLocal(
                          row.emoji,
                          row.media_path,
                          row.role,
                          { intensity: Number(e.target.value) }
                        )
                      }
                    />
                    <span className="intensity-value">
                      {row.intensity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </div>
  );
}