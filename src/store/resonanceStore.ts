import { create } from "zustand";
import { supabase } from "../supabase/client";

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

export const useResonanceStore = create<ResonanceState>((set, get) => ({
  rows: [],
  loading: false,
  error: null,

  /* -------------------------------------------------- */
  /* LOAD (READ-ONLY via Supabase anon)                 */
  /* -------------------------------------------------- */

  load: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from("emoji_media")
      .select("emoji, media_path, role, intensity, enabled")
      .order("emoji", { ascending: true });

    if (error) {
      console.error(error);
      set({ error: error.message, loading: false });
      return;
    }

    set({ rows: data || [], loading: false });
  },

  /* -------------------------------------------------- */
  /* LOCAL UPDATE (UI only)                             */
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
  /* SAVE (via API serveur, RLS-SAFE)                   */
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
        const text = await res.text();
        console.error(text);
        alert("Erreur sauvegarde (API)");
        return;
      }

      alert("Sauvegarde réussie ✔");

    } catch (e) {
      console.error(e);
      alert("Erreur réseau lors de la sauvegarde");
    }
  },
}));