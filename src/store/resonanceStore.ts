import { create } from "zustand";
import { supabase } from "../supabase/client";

/* -------------------------------------------------- */
/* TYPES                                              */
/* -------------------------------------------------- */

export type ResonanceRow = {
  emoji: string;
  media_path: string;
  role: string;
  intensity: number;
  enabled: boolean;
  exists: boolean; // 👈 clé : existe en base ou non
};

type ResonanceState = {
  rows: ResonanceRow[];
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  toggle: (index: number) => void;
  setIntensity: (index: number, value: number) => void;
  save: () => Promise<void>;
};

/* -------------------------------------------------- */
/* STORE                                              */
/* -------------------------------------------------- */

export const useResonanceStore = create<ResonanceState>((set, get) => ({
  rows: [],
  loading: false,
  error: null,

  /* -------------------------------------------------- */
  /* LOAD = ORCHESTRATION                               */
  /* -------------------------------------------------- */

  load: async () => {
    set({ loading: true, error: null });

    try {
      // 1. Charger les médias disponibles
      const { data: medias, error: mediaErr } = await supabase
        .from("media_semantics")
        .select("path, category")
        .eq("enabled", true);

      if (mediaErr) throw mediaErr;

      // 2. Charger les résonances existantes
      const { data: resonances, error: resErr } = await supabase
        .from("emoji_media")
        .select("emoji, media_path, role, intensity, enabled");

      if (resErr) throw resErr;

      const EMOJIS = [...new Set((resonances || []).map(r => r.emoji))];

      const rows: ResonanceRow[] = [];

      for (const emoji of EMOJIS) {
        for (const media of medias || []) {
          const match = resonances?.find(
            r =>
              r.emoji === emoji &&
              r.media_path === media.path &&
              r.role === media.category
          );

          rows.push({
            emoji,
            media_path: media.path,
            role: media.category,
            intensity: match?.intensity ?? 0,
            enabled: match?.enabled ?? false,
            exists: Boolean(match),
          });
        }
      }

      set({ rows, loading: false });

    } catch (e: any) {
      console.error(e);
      set({ error: e.message, loading: false });
    }
  },

  /* -------------------------------------------------- */
  /* UI MUTATIONS (LOCAL ONLY)                          */
  /* -------------------------------------------------- */

  toggle: (index) => {
    set(state => {
      const rows = [...state.rows];
      rows[index] = {
        ...rows[index],
        enabled: !rows[index].enabled,
        exists: true, // 👈 on force la création à la sauvegarde
      };
      return { rows };
    });
  },

  setIntensity: (index, value) => {
    set(state => {
      const rows = [...state.rows];
      rows[index] = {
        ...rows[index],
        intensity: value,
        exists: true,
      };
      return { rows };
    });
  },

  /* -------------------------------------------------- */
  /* SAVE (API SERVER – UPSERT)                         */
  /* -------------------------------------------------- */

  save: async () => {
    const rows = get().rows.filter(r => r.exists);

    try {
      const res = await fetch(
        "https://echohypno-api.vercel.app/api/admin/save",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      alert("Sauvegarde réussie ✔");

    } catch (e) {
      console.error(e);
      alert("Erreur sauvegarde API");
    }
  },
}));