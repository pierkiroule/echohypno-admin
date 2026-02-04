export type EmojiMediaRow = {
  emoji: string;
  media_path: string;
  role: string;      // music | video | voice | text | shader
  intensity: number; // 0..10
  enabled: boolean;
  created_at?: string | null;
};

export type MediaSemanticRow = {
  path: string;
  category: string;  // music | video | voice | text | shader
  climate?: string | null;
  energy?: number | null;
  role?: string | null;
  tags?: string[] | null;
  enabled?: boolean;
  created_at?: string | null;
};

export type RoleFilter = 'all' | 'music' | 'video' | 'voice' | 'text' | 'shader';
