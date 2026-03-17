import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DramaCard } from "@/components/DramaCard";
import { Pagination } from "@/components/Pagination";
import { WelcomeToast } from "@/components/WelcomeToast";
import { GENRE_LABELS } from "@/lib/types";
import type { Drama } from "@/lib/types";

export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 12;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { genre?: string; q?: string; page?: string };
}) {
  const supabase = createServerSupabaseClient();
  const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // 総件数取得用クエリ
  let countQuery = supabase
    .from("dramas")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  // データ取得用クエリ
  let query = supabase
    .from("dramas")
    .select("*, creator:profiles(id, display_name)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  if (searchParams.genre) {
    countQuery = countQuery.eq("genre", searchParams.genre);
    query = query.eq("genre", searchParams.genre);
  }

  if (searchParams.q) {
    const keyword = searchParams.q.trim();
    const filter = `title.ilike.%${keyword}%,description.ilike.%${keyword}%`;
    countQuery = countQuery.or(filter);
    query = query.or(filter);
  }

  const [{ count }, { data: dramas }] = await Promise.all([
    countQuery,
    query,
  ]);

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // URL構築ヘルパー
  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const s = p.toString();
    return s ? `/?${s}` : "/";
  }

  function buildPageUrl(page: number) {
    return buildUrl({
      genre: searchParams.genre,
      q: searchParams.q,
      page: page > 1 ? String(page) : undefined,
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>

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

      {/* 検索バー */}
      <section className="mb-6">
        <form action="/" method="GET" className="max-w-xl mx-auto">
          {searchParams.genre && (
            <input type="hidden" name="genre" value={searchParams.genre} />
          )}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q || ""}
              placeholder="ドラマを検索..."
              className="w-full bg-dark-card border border-dark-border rounded-full pl-12 pr-4 py-3 text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-accent transition"
            />
            {searchParams.q && (
              <a
                href={buildUrl({ genre: searchParams.genre })}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text transition"
                title="検索をクリア"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </a>
            )}
          </div>
        </form>
      </section>

      {/* ジャンルフィルター */}
      <section className="mb-8">
        <div className="flex gap-2 justify-start md:justify-center overflow-x-auto pb-2 scrollbar-hide whitespace-nowrap">
          <a
            href={buildUrl({ q: searchParams.q })}
            className={`px-4 py-2 rounded-full text-sm transition flex-shrink-0 ${
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
              href={buildUrl({ genre: key, q: searchParams.q })}
              className={`px-4 py-2 rounded-full text-sm transition flex-shrink-0 ${
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

      {/* 検索結果表示 */}
      {searchParams.q && (
        <div className="mb-4 text-sm text-dark-muted text-center">
          「{searchParams.q}」の検索結果: {totalCount}件
        </div>
      )}

      {/* ドラマ一覧 */}
      <section>
        {dramas && dramas.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dramas.map((drama: Drama) => (
                <DramaCard key={drama.id} drama={drama} />
              ))}
            </div>

            {/* ページネーション */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildUrl={buildPageUrl}
            />

            {/* 件数情報 */}
            {totalPages > 1 && (
              <p className="text-center text-xs text-dark-muted/50 mt-3">
                {totalCount}件中 {offset + 1}〜{Math.min(offset + ITEMS_PER_PAGE, totalCount)}件を表示
              </p>
            )}
          </>
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
