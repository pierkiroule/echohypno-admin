import { useEffect, useMemo } from "react";
import "./styles.css";
import { useResonanceStore } from "./store/resonanceStore";

export default function App() {
  const { rows, load, toggle, setIntensity, save, loading } =
    useResonanceStore();

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

  if (loading) {
    return <div className="loading">Chargement…</div>;
  }

  /* -------------------------------------------- */
  /* RENDER                                       */
  /* -------------------------------------------- */

  return (
    <div className="app">
      <header>
        <h1>EchoHypno – Admin Résonances</h1>
        <button onClick={save}>💾 Sauver</button>
      </header>

      {Object.entries(grouped).map(([emoji, items]) => (
        <details key={emoji} open>
          <summary>
            <span className="emoji">{emoji}</span>
            <span className="count">{items.length} médias</span>
          </summary>

          <table>
            <thead>
              <tr>
                <th>Actif</th>
                <th>Média</th>
                <th>Rôle</th>
                <th>Intensité</th>
              </tr>
            </thead>

            <tbody>
              {items.map((row) => {
                const index = rows.indexOf(row);

                return (
                  <tr
                    key={`${row.emoji}|${row.media_path}|${row.role}`}
                  >
                    {/* ACTIF */}
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(row.enabled)}
                        onChange={() => toggle(index)}
                      />
                    </td>

                    {/* MEDIA */}
                    <td className="path">{row.media_path}</td>

                    {/* ROLE */}
                    <td>{row.role}</td>

                    {/* INTENSITY */}
                    <td>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={row.intensity}
                        onChange={(e) =>
                          setIntensity(index, Number(e.target.value))
                        }
                      />
                      <span className="intensity">
                        {row.intensity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      ))}
    </div>
  );
}