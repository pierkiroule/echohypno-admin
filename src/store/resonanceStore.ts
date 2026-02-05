import { create } from "zustand";
import { supabase } from "../supabase/client";

/* ----------------------------- */
/* TYPES                         */
/* ----------------------------- */

export type MediaAsset = {
  path: string;
  category: "music" | "video" | "text" | "voice" | "shader";
  climate: "calm" | "deep" | "luminous" | "tense" | "contrast";
  energy: number; // 0 → 1
  role: "background" | "support" | "accent" | "punctuation";
  enabled: boolean;
};

type MediaState = {
  media: MediaAsset[];
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  updateLocal: (path: string, patch: Partial<MediaAsset>) => void;
  save: () => Promise<void>;
};

/* ----------------------------- */
/* STORE                         */
/* ----------------------------- */

export const useMediaStore = create<MediaState>((set, get) => ({
  media: [],
  loading: false,
  error: null,

  /* --------------------------- */
  /* LOAD                        */
  /* --------------------------- */

  load: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from("media_assets")
      .select("path, category, climate, energy, role, enabled")
      .order("category", { ascending: true })
      .order("path", { ascending: true });

    if (error) {
      console.error(error);
      set({ error: error.message, loading: false });
      return;
    }

    set({ media: data || [], loading: false });
  },

  /* --------------------------- */
  /* LOCAL UPDATE                */
  /* --------------------------- */

  updateLocal: (path, patch) => {
    set((state) => ({
      media: state.media.map((m) =>
        m.path === path ? { ...m, ...patch } : m
      ),
    }));
  },

  /* --------------------------- */
  /* SAVE (API serveur)          */
  /* --------------------------- */

  save: async () => {
    const media = get().media;

    try {
      const res = await fetch(
        "https://echohypno-api.vercel.app/api/admin/media/save",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ media }),
        }
      );

      if (!res.ok) {
        console.error(await res.text());
        alert("Erreur sauvegarde API");
        return;
      }

      alert("Sauvegarde réussie ✔");
    } catch (e) {
      console.error(e);
      alert("Erreur réseau");
    }
  },
}));