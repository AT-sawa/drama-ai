export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  coin_balance: number;
  is_creator: boolean;
  created_at: string;
  updated_at: string;
}

export interface Drama {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  genre: string;
  tags: string[];
  total_episodes: number;
  total_views: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface Episode {
  id: string;
  drama_id: string;
  episode_number: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  video_url: string | null;
  cloudflare_video_id: string | null;
  duration: number;
  coin_price: number;
  view_count: number;
  is_published: boolean;
  is_free: boolean;
  created_at: string;
  updated_at: string;
  drama?: Drama;
}

export interface Purchase {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  amount_jpy: number;
  coin_amount: number;
  status: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: "purchase" | "view" | "generate" | "revenue";
  amount: number;
  balance_after: number;
  reference_id: string | null;
  description: string;
  created_at: string;
}

export interface View {
  id: string;
  user_id: string;
  episode_id: string;
  coin_spent: number;
  watched_at: string;
}

export const COIN_PACKAGES = [
  { id: "pack_500", price: 500, coins: 500, label: "500コイン", bonus: "" },
  {
    id: "pack_1200",
    price: 1000,
    coins: 1200,
    label: "1,200コイン",
    bonus: "+200ボーナス",
  },
  {
    id: "pack_4200",
    price: 3000,
    coins: 4200,
    label: "4,200コイン",
    bonus: "+1,200ボーナス",
  },
] as const;

export const GENERATE_COST = 500;
export const CREATOR_REVENUE_RATE = 0.7;

export const GENRES = [
  "drama",
  "romance",
  "action",
  "comedy",
  "thriller",
  "sci-fi",
  "horror",
  "fantasy",
] as const;

export const GENRE_LABELS: Record<string, string> = {
  drama: "ドラマ",
  romance: "恋愛",
  action: "アクション",
  comedy: "コメディ",
  thriller: "スリラー",
  "sci-fi": "SF",
  horror: "ホラー",
  fantasy: "ファンタジー",
};
