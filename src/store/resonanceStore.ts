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
};

type ResonanceState = {
  rows: ResonanceRow[];
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  updateLocal: (
    emoji: string,
    media_path: string,
    role: string,
    patch: Partial<Pick<ResonanceRow, "intensity" | "enabled">>
  ) => void;
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
  /* LOAD — READ ONLY (Supabase ANON, RLS OK)           */
  /* -------------------------------------------------- */

  load: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from("emoji_media")
      .select("emoji, media_path, role, intensity, enabled")
      .order("emoji", { ascending: true });

    if (error) {
      console.error("[load error]", error);
      set({ error: error.message, loading: false });
      return;
    }

    set({
      rows: Array.isArray(data) ? data : [],
      loading: false,
    });
  },

  /* -------------------------------------------------- */
  /* LOCAL UPDATE — UI ONLY                             */
  /* -------------------------------------------------- */

  updateLocal: (emoji, media_path, role, patch) => {
    set((state) => ({
      rows: state.rows.map((r) =>
        r.emoji === emoji &&
        r.media_path === media_path &&
        r.role === role
          ? { ...r, ...patch }
          : r
      ),
    }));
  },

  /* -------------------------------------------------- */
  /* SAVE — VIA API SERVEUR (SERVICE ROLE, RLS SAFE)    */
  /* -------------------------------------------------- */

  save: async () => {
    const rows = get().rows;

    try {
      const res = await fetch(
        "https://echohypno-api.vercel.app/api/admin/save",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rows }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[save api error]", errorText);
        alert("Erreur sauvegarde (API)");
        return;
      }

      alert("Sauvegarde réussie ✔");

    } catch (err) {
      console.error("[save network error]", err);
      alert("Erreur réseau lors de la sauvegarde");
    }
  },
}));