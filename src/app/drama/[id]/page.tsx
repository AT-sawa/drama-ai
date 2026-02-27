import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EpisodeList } from "@/components/EpisodeList";
import { GENRE_LABELS } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Episode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DramaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();

  const { data: drama } = await supabase
    .from("dramas")
    .select("*, creator:profiles(*)")
    .eq("id", params.id)
    .eq("is_published", true)
    .single();

  if (!drama) notFound();

  const { data: episodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("drama_id", params.id)
    .eq("is_published", true)
    .order("episode_number", { ascending: true });

  // ログインユーザーの視聴記録取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewedEpisodeIds = new Set<string>();
  if (user) {
    const { data: views } = await supabase
      .from("views")
      .select("episode_id")
      .eq("user_id", user.id);
    if (views) {
      viewedEpisodeIds = new Set(views.map((v) => v.episode_id));
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ドラマ情報ヘッダー */}
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        <div className="w-full md:w-80 flex-shrink-0">
          <div className="aspect-video relative rounded-xl overflow-hidden bg-dark-card border border-dark-border">
            {drama.thumbnail_url ? (
              <Image
                src={drama.thumbnail_url}
                alt={drama.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-orange-900/20">
                <svg
                  className="w-16 h-16 text-accent/40"
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
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-accent/20 text-accent text-xs rounded-full">
              {GENRE_LABELS[drama.genre] || drama.genre}
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-3">{drama.title}</h1>
          <p className="text-dark-muted leading-relaxed mb-4">
            {drama.description}
          </p>

          <div className="flex items-center gap-6 text-sm text-dark-muted">
            <span>{drama.total_episodes} エピソード</span>
            <span>{drama.total_views.toLocaleString()} 回視聴</span>
          </div>

          {drama.creator && (
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold text-accent">
                {drama.creator.display_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-dark-muted">
                {drama.creator.display_name}
              </span>
            </div>
          )}

          {drama.tags && drama.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {drama.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-dark-border/50 text-xs text-dark-muted rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* エピソード一覧 */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          エピソード一覧
          <span className="text-dark-muted text-sm font-normal ml-2">
            ({episodes?.length || 0}件)
          </span>
        </h2>

        {!user && (
          <div className="mb-4 p-3 bg-dark-card border border-dark-border rounded-lg text-sm text-dark-muted">
            エピソードを視聴するには
            <Link href="/login" className="text-accent hover:underline mx-1">
              ログイン
            </Link>
            してください。
          </div>
        )}

        {episodes && episodes.length > 0 ? (
          <EpisodeList
            episodes={episodes as Episode[]}
            viewedEpisodeIds={viewedEpisodeIds}
          />
        ) : (
          <div className="text-center py-12 text-dark-muted">
            <p>エピソードはまだありません</p>
          </div>
        )}
      </section>
    </div>
  );
}
