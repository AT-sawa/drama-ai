import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DramaCard } from "@/components/DramaCard";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Drama } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ユーザーのいいね一覧を取得（新しい順）
  const { data: likes } = await supabase
    .from("likes")
    .select("drama_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  let dramas: Drama[] = [];

  if (likes && likes.length > 0) {
    const dramaIds = likes.map((l) => l.drama_id);
    const { data } = await supabase
      .from("dramas")
      .select("*, creator:profiles(id, display_name)")
      .in("id", dramaIds)
      .eq("is_published", true);

    if (data) {
      // いいねした順番を維持
      const dramaMap = new Map(data.map((d) => [d.id, d]));
      dramas = dramaIds
        .map((id) => dramaMap.get(id))
        .filter((d): d is Drama => !!d);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <svg
            className="w-8 h-8 text-red-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          お気に入り一覧
        </h1>
        <p className="text-dark-muted mt-2">
          いいねした作品が新しい順に表示されます
        </p>
      </div>

      {dramas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dramas.map((drama) => (
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
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <p className="text-dark-muted text-lg">
            お気に入りの作品はまだありません
          </p>
          <p className="text-dark-muted/60 text-sm mt-1">
            作品のハートボタンを押していいねしましょう！
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
