import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // on laisse l'app démarrer, mais on affichera l'erreur côté UI
  // (évite crash build)
}

export const supabase = createClient(url ?? '', anon ?? '');
