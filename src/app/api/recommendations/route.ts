import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// レコメンドAPI: 視聴傾向に基づくおすすめドラマを返す
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 未ログインの場合は人気順で返す
    if (!user) {
      const { data: popular } = await supabase
        .from("dramas")
        .select("*, creator:profiles(id, display_name)")
        .eq("is_published", true)
        .order("total_views", { ascending: false })
        .limit(8);

      return NextResponse.json({
        recommendations: popular || [],
        reason: "popular",
      });
    }

    // 1. ユーザーの視聴履歴からジャンル傾向を取得
    const { data: watchedEpisodes } = await supabase
      .from("views")
      .select("episode_id")
      .eq("user_id", user.id);

    // 2. いいねしたドラマを取得
    const { data: likedDramas } = await supabase
      .from("likes")
      .select("drama_id")
      .eq("user_id", user.id);

    const likedDramaIds = (likedDramas || []).map((l) => l.drama_id);

    // 3. 視聴済みエピソードからドラマIDとジャンルを取得
    let watchedDramaIds: string[] = [];
    let genreScores: Record<string, number> = {};

    if (watchedEpisodes && watchedEpisodes.length > 0) {
      const episodeIds = watchedEpisodes.map((v) => v.episode_id);

      const { data: episodes } = await supabase
        .from("episodes")
        .select("drama_id")
        .in("id", episodeIds);

      if (episodes) {
        watchedDramaIds = Array.from(new Set(episodes.map((e) => e.drama_id)));
      }
    }

    // 4. 視聴・いいね済みドラマのジャンルを集計
    const allEngagedIds = Array.from(new Set(watchedDramaIds.concat(likedDramaIds)));

    if (allEngagedIds.length > 0) {
      const { data: engagedDramas } = await supabase
        .from("dramas")
        .select("genre")
        .in("id", allEngagedIds);

      if (engagedDramas) {
        for (const d of engagedDramas) {
          genreScores[d.genre] = (genreScores[d.genre] || 0) + 1;
        }
      }
    }

    // 5. おすすめドラマを取得
    // 優先度: 好みのジャンル × 人気度（いいね数・視聴数）
    const sortedGenres = Object.entries(genreScores)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    let recommendations: any[] = [];

    if (sortedGenres.length > 0) {
      // 好みのジャンルから未視聴のドラマを取得
      let query = supabase
        .from("dramas")
        .select("*, creator:profiles(id, display_name)")
        .eq("is_published", true)
        .in("genre", sortedGenres.slice(0, 3));

      // 自分が作ったドラマは除外
      query = query.neq("creator_id", user.id);

      const { data: genreBased } = await query
        .order("likes_count", { ascending: false })
        .order("total_views", { ascending: false })
        .limit(12);

      if (genreBased) {
        // 未視聴を優先し、視聴済みを後ろに
        const unwatched = genreBased.filter(
          (d) => !watchedDramaIds.includes(d.id)
        );
        const watched = genreBased.filter((d) =>
          watchedDramaIds.includes(d.id)
        );
        recommendations = [...unwatched, ...watched].slice(0, 8);
      }
    }

    // レコメンドが足りない場合、人気ドラマで補完
    if (recommendations.length < 4) {
      const excludeIds = recommendations.map((d) => d.id);

      let popularQuery = supabase
        .from("dramas")
        .select("*, creator:profiles(id, display_name)")
        .eq("is_published", true)
        .neq("creator_id", user.id);

      if (excludeIds.length > 0) {
        // 既にレコメンドに含まれるものを除外
        for (const id of excludeIds) {
          popularQuery = popularQuery.neq("id", id);
        }
      }

      const { data: popular } = await popularQuery
        .order("total_views", { ascending: false })
        .limit(8 - recommendations.length);

      if (popular) {
        recommendations = [...recommendations, ...popular];
      }
    }

    return NextResponse.json({
      recommendations,
      reason: sortedGenres.length > 0 ? "personalized" : "popular",
      favoriteGenres: sortedGenres.slice(0, 3),
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    return NextResponse.json(
      { error: "レコメンド取得に失敗しました" },
      { status: 500 }
    );
  }
}
