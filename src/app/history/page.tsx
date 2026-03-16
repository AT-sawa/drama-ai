import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Episode, Drama } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ViewWithDetails {
  episode_id: string;
  watched_at: string;
  coin_spent: number;
  episode: {
    id: string;
    title: string;
    episode_number: number;
    thumbnail_url: string | null;
    duration: number;
    drama_id: string;
    drama: {
      id: string;
      title: string;
      thumbnail_url: string | null;
    };
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function HistoryPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 視聴履歴を取得（新しい順、エピソード・ドラマ情報含む）
  const { data: views } = await supabase
    .from("views")
    .select(
      "episode_id, watched_at, coin_spent, episode:episodes(id, title, episode_number, thumbnail_url, duration, drama_id, drama:dramas(id, title, thumbnail_url))"
    )
    .eq("user_id", user.id)
    .order("watched_at", { ascending: false })
    .limit(100);

  // ドラマごとにグループ化（最新視聴順）
  const dramaGroups = new Map<
    string,
    {
      drama: { id: string; title: string; thumbnail_url: string | null };
      episodes: {
        id: string;
        title: string;
        episode_number: number;
        thumbnail_url: string | null;
        duration: number;
        watched_at: string;
        coin_spent: number;
      }[];
      lastWatched: string;
    }
  >();

  if (views) {
    for (const view of views as unknown as ViewWithDetails[]) {
      if (!view.episode?.drama) continue;

      const dramaId = view.episode.drama.id;
      if (!dramaGroups.has(dramaId)) {
        dramaGroups.set(dramaId, {
          drama: view.episode.drama,
          episodes: [],
          lastWatched: view.watched_at,
        });
      }

      dramaGroups.get(dramaId)!.episodes.push({
        id: view.episode.id,
        title: view.episode.title,
        episode_number: view.episode.episode_number,
        thumbnail_url: view.episode.thumbnail_url,
        duration: view.episode.duration,
        watched_at: view.watched_at,
        coin_spent: view.coin_spent,
      });
    }
  }

  const groupedList = Array.from(dramaGroups.values());

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <svg
            className="w-8 h-8 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          視聴履歴
        </h1>
        <p className="text-dark-muted mt-2">
          視聴した作品が新しい順に表示されます
        </p>
      </div>

      {groupedList.length > 0 ? (
        <div className="space-y-6">
          {groupedList.map((group) => {
            const latestEpisode = group.episodes[0];
            const watchedCount = group.episodes.length;

            return (
              <div
                key={group.drama.id}
                className="bg-dark-card border border-dark-border rounded-xl overflow-hidden"
              >
                {/* ドラマヘッダー */}
                <div className="p-4 md:p-5">
                  <div className="flex gap-4">
                    {/* サムネイル */}
                    <Link
                      href={`/drama/${group.drama.id}`}
                      className="flex-shrink-0"
                    >
                      <div className="w-28 md:w-36 aspect-video relative rounded-lg overflow-hidden bg-dark-border">
                        {group.drama.thumbnail_url ? (
                          <Image
                            src={group.drama.thumbnail_url}
                            alt={group.drama.title}
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-orange-900/20">
                            <svg
                              className="w-8 h-8 text-accent/40"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* 情報 */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/drama/${group.drama.id}`}
                        className="hover:text-accent transition"
                      >
                        <h2 className="font-bold text-lg truncate">
                          {group.drama.title}
                        </h2>
                      </Link>
                      <p className="text-sm text-dark-muted mt-1">
                        {watchedCount} エピソード視聴済み
                      </p>
                      <p className="text-xs text-dark-muted/60 mt-1">
                        最終視聴: {formatDate(group.lastWatched)}
                      </p>

                      {/* 続きを見るボタン */}
                      <Link
                        href={`/watch/${latestEpisode.id}`}
                        className="inline-flex items-center gap-2 mt-3 bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        続きを見る
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 視聴済みエピソード一覧（折りたたみ可能にするなら将来対応） */}
                {group.episodes.length > 1 && (
                  <div className="border-t border-dark-border px-4 md:px-5 py-3">
                    <p className="text-xs text-dark-muted mb-2">
                      視聴済みエピソード
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.episodes
                        .sort(
                          (a, b) => a.episode_number - b.episode_number
                        )
                        .map((ep) => (
                          <Link
                            key={ep.id}
                            href={`/watch/${ep.id}`}
                            className="px-3 py-1 bg-dark-border/50 hover:bg-accent/20 hover:text-accent text-xs rounded-full transition"
                            title={ep.title}
                          >
                            EP{ep.episode_number}
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-dark-muted text-lg">視聴履歴はまだありません</p>
          <p className="text-dark-muted/60 text-sm mt-1">
            作品を視聴すると履歴が表示されます
          </p>
          <Link
            href="/"
            className="inline-block mt-6 bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-2.5 rounded-lg transition"
          >
            作品を探す
          </Link>
        </div>
      )}
    </div>
  );
}
