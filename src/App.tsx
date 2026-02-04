import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase/client";
import "./styles.css";

/* ---------------- Types ---------------- */

type Role = "music" | "video" | "shader" | "voice" | "text";
type EmojiMediaRow = {
  emoji: string;
  media_path: string;
  role: Role;
  intensity: number;
  enabled: boolean;
  created_at?: string | null;
};
type MediaSemanticsRow = {
  path: string;
  category: "music" | "video" | "shader" | "voice" | "text";
  climate?: string | null;
  energy?: number | null;
  role?: string | null;
  tags?: string[] | null;
  enabled?: boolean | null;
  created_at?: string | null;
};

type SavePatch = Pick<EmojiMediaRow, "emoji" | "media_path" | "role" | "intensity" | "enabled">;

/* ---------------- Helpers ---------------- */

const ROLE_LABEL: Record<Role, string> = {
  music: "🎵 Music",
  video: "🎥 Video",
  shader: "🌀 Shader",
  voice: "🗣 Voice",
  text: "📄 Text",
};

const clampInt = (n: number, min = 0, max = 10) => Math.min(max, Math.max(min, Math.round(n)));

const cleanEmoji = (e: string) => (e || "").trim();

const isNonEmpty = (s: any) => typeof s === "string" && s.trim().length > 0;

const keyOf = (r: { emoji: string; media_path: string; role: Role }) =>
  `${cleanEmoji(r.emoji)}|${(r.media_path || "").trim()}|${r.role}`;

const byCreatedDesc = (a?: string | null, b?: string | null) => {
  const da = a ? new Date(a).getTime() : 0;
  const db = b ? new Date(b).getTime() : 0;
  return db - da;
};

const lastNDaysIso = (days: number) => {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
};

/* ---------------- UI ---------------- */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [emojiMedia, setEmojiMedia] = useState<EmojiMediaRow[]>([]);
  const [mediaSemantics, setMediaSemantics] = useState<MediaSemanticsRow[]>([]);

  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  // Panel filters
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled" | "new">("all");
  const [sortMode, setSortMode] = useState<"intensity_desc" | "created_desc" | "name_asc">(
    "intensity_desc"
  );
  const [search, setSearch] = useState("");

  const [toast, setToast] = useState<string | null>(null);

  // Local edits (diff-only)
  const editsRef = useRef<Map<string, SavePatch>>(new Map());
  const [, forceRender] = useState(0);

  const bump = () => forceRender((x) => x + 1);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 2200);
  };

  /* ----------- Load data ----------- */

  const loadAll = async () => {
    setLoading(true);
    setFatalError(null);
    try {
      const [semRes, emRes] = await Promise.all([
        supabase.from("media_semantics").select("*").order("created_at", { ascending: false }),
        supabase.from("emoji_media").select("*").order("created_at", { ascending: false }),
      ]);

      if (semRes.error) throw semRes.error;
      if (emRes.error) throw emRes.error;

      const sem = (semRes.data || []).map((r: any) => ({
        ...r,
        path: (r.path || "").trim(),
        category: (r.category || "").trim(),
      })) as MediaSemanticsRow[];

      const em = (emRes.data || [])
        .map((r: any) => ({
          emoji: cleanEmoji(r.emoji),
          media_path: (r.media_path || "").trim(),
          role: (r.role || "").trim(),
          intensity: Number.isFinite(r.intensity) ? Number(r.intensity) : 0,
          enabled: !!r.enabled,
          created_at: r.created_at || null,
        }))
        .filter((r: EmojiMediaRow) => isNonEmpty(r.emoji) && isNonEmpty(r.media_path) && isNonEmpty(r.role))
        .map((r: any) => ({ ...r, role: r.role as Role })) as EmojiMediaRow[];

      setMediaSemantics(sem);
      setEmojiMedia(em);

      // If selection vanished
      if (selectedEmoji && !em.some((x) => x.emoji === selectedEmoji)) setSelectedEmoji(null);

    } catch (e: any) {
      setFatalError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------- Derived sets ----------- */

  const emojiList = useMemo(() => {
    const s = new Set<string>();
    for (const r of emojiMedia) s.add(cleanEmoji(r.emoji));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [emojiMedia]);

  const semanticsByPath = useMemo(() => {
    const m = new Map<string, MediaSemanticsRow>();
    for (const r of mediaSemantics) {
      if (isNonEmpty(r.path)) m.set(r.path.trim(), r);
    }
    return m;
  }, [mediaSemantics]);

  const selectedRowsRaw = useMemo(() => {
    if (!selectedEmoji) return [];
    return emojiMedia.filter((r) => cleanEmoji(r.emoji) === selectedEmoji);
  }, [emojiMedia, selectedEmoji]);

  const selectedRows = useMemo(() => {
    // Apply local edits over fetched rows
    const out = selectedRowsRaw.map((r) => {
      const k = keyOf(r);
      const patch = editsRef.current.get(k);
      return patch ? { ...r, ...patch } : r;
    });
    return out;
  }, [selectedRowsRaw]);

  const newThresholdIso = useMemo(() => lastNDaysIso(2), []);

  const filteredSelectedRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = [...selectedRows];

    if (roleFilter !== "all") rows = rows.filter((r) => r.role === roleFilter);

    if (statusFilter === "enabled") rows = rows.filter((r) => !!r.enabled);
    if (statusFilter === "disabled") rows = rows.filter((r) => !r.enabled);
    if (statusFilter === "new")
      rows = rows.filter((r) => (r.created_at || "") >= newThresholdIso);

    if (q) {
      rows = rows.filter((r) => {
        const sem = semanticsByPath.get(r.media_path);
        const name = r.media_path.split("/").pop() || r.media_path;
        const tags = Array.isArray(sem?.tags) ? sem!.tags!.join(" ") : "";
        const climate = sem?.climate || "";
        return (
          name.toLowerCase().includes(q) ||
          r.media_path.toLowerCase().includes(q) ||
          tags.toLowerCase().includes(q) ||
          climate.toLowerCase().includes(q)
        );
      });
    }

    if (sortMode === "intensity_desc") {
      rows.sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
    } else if (sortMode === "created_desc") {
      rows.sort((a, b) => byCreatedDesc(a.created_at || null, b.created_at || null));
    } else if (sortMode === "name_asc") {
      rows.sort((a, b) => {
        const an = (a.media_path.split("/").pop() || a.media_path).toLowerCase();
        const bn = (b.media_path.split("/").pop() || b.media_path).toLowerCase();
        return an.localeCompare(bn);
      });
    }

    return rows;
  }, [selectedRows, roleFilter, statusFilter, sortMode, search, semanticsByPath, newThresholdIso]);

  const emojiBadges = useMemo(() => {
    const map = new Map<string, { enabled: number; total: number; newest: boolean }>();
    for (const e of emojiList) map.set(e, { enabled: 0, total: 0, newest: false });
    for (const r of emojiMedia) {
      const e = cleanEmoji(r.emoji);
      const v = map.get(e) || { enabled: 0, total: 0, newest: false };
      v.total += 1;
      if (r.enabled) v.enabled += 1;
      if ((r.created_at || "") >= newThresholdIso) v.newest = true;
      map.set(e, v);
    }
    return map;
  }, [emojiMedia, emojiList, newThresholdIso]);

  /* ----------- Local edits ----------- */

  const setRowEdit = (row: EmojiMediaRow, patch: Partial<SavePatch>) => {
    const k = keyOf(row);
    const base: SavePatch = {
      emoji: row.emoji,
      media_path: row.media_path,
      role: row.role,
      intensity: row.intensity,
      enabled: row.enabled,
    };
    const next = { ...base, ...patch };

    // keep intensity safe
    next.intensity = clampInt(next.intensity);

    editsRef.current.set(k, next);
    bump();
  };

  const clearEditsForEmoji = (emoji: string) => {
    const keys = Array.from(editsRef.current.keys());
    for (const k of keys) {
      if (k.startsWith(`${emoji}|`)) editsRef.current.delete(k);
    }
    bump();
    showToast("Modifs locales annulées");
  };

  const pendingCountForEmoji = (emoji: string | null) => {
    if (!emoji) return 0;
    let c = 0;
    for (const k of editsRef.current.keys()) if (k.startsWith(`${emoji}|`)) c++;
    return c;
  };

  /* ----------- Actions (auto-fill / normalize / random soft) ----------- */

  const applyToFiltered = (fn: (r: EmojiMediaRow) => Partial<SavePatch>) => {
    for (const r of filteredSelectedRows) setRowEdit(r, fn(r));
    showToast("Modifs appliquées (local)");
  };

  const autoFill = () => {
    applyToFiltered((r) => {
      const defaults: Record<Role, number> = {
        music: 6,
        video: 6,
        shader: 5,
        voice: 4,
        text: 4,
      };
      return { intensity: defaults[r.role] ?? 5, enabled: true };
    });
  };

  const normalize = () => {
    // Normalize per role within filtered list (keep relative ratios)
    const groups = new Map<Role, EmojiMediaRow[]>();
    for (const r of filteredSelectedRows) {
      const arr = groups.get(r.role) || [];
      arr.push(r);
      groups.set(r.role, arr);
    }

    for (const [role, arr] of groups.entries()) {
      const enabledArr = arr.filter((x) => x.enabled);
      if (!enabledArr.length) continue;

      const total = enabledArr.reduce((s, x) => s + (x.intensity || 0), 0) || 1;
      // target sum = 30 for better spread (3 medias * 10 max) but clamp to 10
      const target = Math.min(30, enabledArr.length * 10);

      for (const r of enabledArr) {
        const raw = (r.intensity || 0) / total;
        const next = clampInt(raw * target, 0, 10);
        setRowEdit(r, { intensity: next });
      }
    }
    showToast("Normalisation (local)");
  };

  const randomSoft = () => {
    applyToFiltered((r) => {
      const delta = Math.random() < 0.5 ? -1 : 1;
      return { intensity: clampInt((r.intensity || 0) + delta, 0, 10) };
    });
  };

  /* ----------- Save to Supabase (diff-only) ----------- */

  const saveEmoji = async (emoji: string) => {
    const patches = Array.from(editsRef.current.values()).filter((p) => cleanEmoji(p.emoji) === emoji);
    if (!patches.length) {
      showToast("Rien à sauvegarder");
      return;
    }

    try {
      // Update row-by-row (safe without id PK)
      // Requires RLS UPDATE policy allowing update.
      for (const p of patches) {
        const { error } = await supabase
          .from("emoji_media")
          .update({ intensity: p.intensity, enabled: p.enabled })
          .eq("emoji", p.emoji)
          .eq("media_path", p.media_path)
          .eq("role", p.role);

        if (error) throw error;
      }

      // Clear saved patches
      for (const k of Array.from(editsRef.current.keys())) {
        if (k.startsWith(`${emoji}|`)) editsRef.current.delete(k);
      }

      showToast("Sauvegardé ✅");
      await loadAll();
    } catch (e: any) {
      showToast("Erreur sauvegarde ❌");
      console.error(e);
    }
  };

  /* ----------- Render ----------- */

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">
          <div className="h1">Resonance Admin</div>
          <div className="sub">Emoji → Médias (Supabase)</div>
        </div>

        <div className="topbarActions">
          <button className="btn" onClick={loadAll} disabled={loading}>
            Recharger
          </button>
        </div>
      </header>

      {toast ? <div className="toast">{toast}</div> : null}

      <main className="main">
        <section className="left">
          <div className="panelHeader">
            <div className="panelTitle">Emojis</div>
            <div className="panelHint">Clique → panneau de résonance</div>
          </div>

          {fatalError ? (
            <div className="errorBox">
              <div className="errorTitle">Erreur Supabase</div>
              <pre className="errorText">{fatalError}</pre>
              <button className="btn" onClick={loadAll}>Retry load</button>
            </div>
          ) : null}

          {loading ? (
            <div className="loading">Chargement…</div>
          ) : (
            <div className="emojiGrid">
              {emojiList.map((e) => {
                const b = emojiBadges.get(e) || { enabled: 0, total: 0, newest: false };
                const active = selectedEmoji === e;
                return (
                  <button
                    key={e}
                    className={`emojiTile ${active ? "active" : ""}`}
                    onClick={() => setSelectedEmoji(e)}
                  >
                    <div className="emoji">{e}</div>
                    <div className="badges">
                      <span className="badge">{b.enabled}/{b.total}</span>
                      {b.newest ? <span className="badge new">new</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="right">
          {!selectedEmoji ? (
            <div className="emptyState">
              <div className="emptyTitle">Sélectionne un emoji</div>
              <div className="emptySub">Pour afficher et régler ses médias associés.</div>
            </div>
          ) : (
            <div className="drawer">
              <div className="drawerHeader">
                <div className="drawerTitle">
                  <span className="emojiBig">{selectedEmoji}</span>
                  <span>Résonance</span>
                </div>

                <div className="drawerMeta">
                  <span className="muted">Modifs en attente: {pendingCountForEmoji(selectedEmoji)}</span>
                </div>

                <div className="drawerActions">
                  <button className="btn" onClick={autoFill}>Auto-fill</button>
                  <button className="btn" onClick={normalize}>Normaliser</button>
                  <button className="btn" onClick={randomSoft}>Random soft</button>
                  <button className="btn ghost" onClick={() => clearEditsForEmoji(selectedEmoji)}>Annuler</button>
                  <button className="btn primary" onClick={() => saveEmoji(selectedEmoji)}>
                    Sauvegarder
                  </button>
                </div>
              </div>

              <div className="filters">
                <div className="filterRow">
                  <label>Type</label>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}>
                    <option value="all">All</option>
                    <option value="music">🎵 Music</option>
                    <option value="video">🎥 Video</option>
                    <option value="shader">🌀 Shader</option>
                    <option value="voice">🗣 Voice</option>
                    <option value="text">📄 Text</option>
                  </select>

                  <label>Statut</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                    <option value="all">All</option>
                    <option value="enabled">Actifs</option>
                    <option value="disabled">Inactifs</option>
                    <option value="new">Nouveaux (2j)</option>
                  </select>

                  <label>Tri</label>
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)}>
                    <option value="intensity_desc">Intensité ↓</option>
                    <option value="created_desc">Date ↓</option>
                    <option value="name_asc">Nom ↑</option>
                  </select>

                  <input
                    className="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher (nom, tags, climat)…"
                  />
                </div>
              </div>

              <div className="list">
                {filteredSelectedRows.length === 0 ? (
                  <div className="emptyList">Aucun média pour ces filtres.</div>
                ) : (
                  filteredSelectedRows.map((r) => {
                    const sem = semanticsByPath.get(r.media_path);
                    const name = r.media_path.split("/").pop() || r.media_path;
                    const isNew = (r.created_at || "") >= newThresholdIso;

                    return (
                      <div className="row" key={keyOf(r)}>
                        <div className="rowLeft">
                          <div className="rowTop">
                            <div className="rowName">
                              <span className="rolePill">{ROLE_LABEL[r.role]}</span>
                              <span className="name">{name}</span>
                              {isNew ? <span className="pillNew">new</span> : null}
                            </div>
                          </div>

                          <div className="rowSub">
                            <span className="path">{r.media_path}</span>
                            {sem?.climate ? <span className="pill">{sem.climate}</span> : null}
                            {Array.isArray(sem?.tags) && sem!.tags!.length ? (
                              <span className="pill">{sem!.tags!.slice(0, 4).join(" • ")}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="rowRight">
                          <div className="controls">
                            <div className="ctrl">
                              <span className="ctrlLabel">Int</span>
                              <input
                                type="range"
                                min={0}
                                max={10}
                                value={clampInt(r.intensity)}
                                onChange={(e) => setRowEdit(r, { intensity: Number(e.target.value) })}
                              />
                              <span className="ctrlValue">{clampInt(r.intensity)}</span>
                            </div>

                            <label className="toggle">
                              <input
                                type="checkbox"
                                checked={!!r.enabled}
                                onChange={(e) => setRowEdit(r, { enabled: e.target.checked })}
                              />
                              <span>Actif</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
