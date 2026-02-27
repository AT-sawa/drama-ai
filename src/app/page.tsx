import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DramaCard } from "@/components/DramaCard";
import { GENRE_LABELS } from "@/lib/types";
import type { Drama } from "@/lib/types";

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { genre?: string };
}) {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("dramas")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (searchParams.genre) {
    query = query.eq("genre", searchParams.genre);
  }

  const { data: dramas } = await query;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ヒーローセクション */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          <span className="text-gradient">AI</span>が紡ぐ
          <br className="md:hidden" />
          新しい物語
        </h1>
        <p className="text-dark-muted text-lg max-w-2xl mx-auto">
          AIが生成するオリジナルドラマを楽しもう。
          クリエイターとして自分だけの作品を作ることもできます。
        </p>
      </section>

      {/* ジャンルフィルター */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-2">
          <a
            href="/"
            className={`px-4 py-2 rounded-full text-sm transition ${
              !searchParams.genre
                ? "bg-accent text-white"
                : "bg-dark-card border border-dark-border text-dark-muted hover:border-accent/50"
            }`}
          >
            すべて
          </a>
          {Object.entries(GENRE_LABELS).map(([key, label]) => (
            <a
              key={key}
              href={`/?genre=${key}`}
              className={`px-4 py-2 rounded-full text-sm transition ${
                searchParams.genre === key
                  ? "bg-accent text-white"
                  : "bg-dark-card border border-dark-border text-dark-muted hover:border-accent/50"
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* ドラマ一覧 */}
      <section>
        {dramas && dramas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dramas.map((drama: Drama) => (
              <DramaCard key={drama.id} drama={drama} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 mx-auto text-dark-muted/30 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4V2m0 2a2 2 0 012 2v1a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2zm0 10v2m0-2a2 2 0 00-2-2H4a2 2 0 00-2 2v1a2 2 0 002 2h1a2 2 0 002-2zm10-10V2m0 2a2 2 0 012 2v1a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2z"
              />
            </svg>
            <p className="text-dark-muted text-lg">ドラマがまだありません</p>
            <p className="text-dark-muted/60 text-sm mt-1">
              最初のクリエイターになりましょう！
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
