import { useEffect } from "react";
import "./styles.css";
import { useMediaStore } from "./store/mediaStore";

export default function App() {
  const { media, load, updateLocal, save, loading } = useMediaStore();

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="loading">Chargement…</div>;
  }

  return (
    <div className="app">
      <header>
        <h1>EchoHypno – Admin Médias</h1>
        <button onClick={save}>💾 Sauver</button>
      </header>

      <table>
        <thead>
          <tr>
            <th>Actif</th>
            <th>Fichier</th>
            <th>Catégorie</th>
            <th>Climat</th>
            <th>Énergie</th>
            <th>Rôle</th>
          </tr>
        </thead>

        <tbody>
          {media.map((m) => (
            <tr key={m.path}>
              <td>
                <input
                  type="checkbox"
                  checked={m.enabled}
                  onChange={(e) =>
                    updateLocal(m.path, { enabled: e.target.checked })
                  }
                />
              </td>

              <td className="path">{m.path}</td>
              <td>{m.category}</td>

              <td>
                <select
                  value={m.climate}
                  onChange={(e) =>
                    updateLocal(m.path, { climate: e.target.value as any })
                  }
                >
                  <option value="calm">calm</option>
                  <option value="deep">deep</option>
                  <option value="luminous">luminous</option>
                  <option value="tense">tense</option>
                  <option value="contrast">contrast</option>
                </select>
              </td>

              <td>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={m.energy}
                  onChange={(e) =>
                    updateLocal(m.path, {
                      energy: Number(e.target.value),
                    })
                  }
                />
                <span>{m.energy.toFixed(2)}</span>
              </td>

              <td>
                <select
                  value={m.role}
                  onChange={(e) =>
                    updateLocal(m.path, { role: e.target.value as any })
                  }
                >
                  <option value="background">background</option>
                  <option value="support">support</option>
                  <option value="accent">accent</option>
                  <option value="punctuation">punctuation</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}