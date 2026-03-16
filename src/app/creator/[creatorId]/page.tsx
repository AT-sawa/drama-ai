import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DramaCard } from "@/components/DramaCard";
import { getSiteUrl } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { Drama, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { creatorId: string };
}): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data: creator } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", params.creatorId)
    .eq("is_creator", true)
    .single();

  if (!creator) {
    return { title: "クリエイターが見つかりません" };
  }

  const siteUrl = getSiteUrl();
  const title = `${creator.display_name}の作品一覧`;
  const description = `${creator.display_name}が制作したAIドラマ作品をチェック`;

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      title,
      description,
      url: `${siteUrl}/creator/${params.creatorId}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(creator.display_name)}&description=${encodeURIComponent(description)}&type=creator`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?title=${encodeURIComponent(creator.display_name)}&description=${encodeURIComponent(description)}&type=creator`],
    },
  };
}

export default async function CreatorPublicPage({
  params,
}: {
  params: { creatorId: string };
}) {
  const supabase = createServerSupabaseClient();

  // クリエイター情報取得
  const { data: creator } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.creatorId)
    .eq("is_creator", true)
    .single();

  if (!creator) notFound();

  // 公開作品を取得
  const { data: dramas } = await supabase
    .from("dramas")
    .select("*")
    .eq("creator_id", params.creatorId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const totalViews =
    dramas?.reduce((sum: number, d: Drama) => sum + d.total_views, 0) || 0;
  const totalDramas = dramas?.length || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* クリエイタープロフィール */}
      <section className="mb-10">
        <div className="bg-dark-card border border-dark-border rounded-xl p-6 md:p-8">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-accent/30 flex items-center justify-center text-2xl md:text-3xl font-bold text-accent flex-shrink-0">
              {(creator as Profile).display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold truncate">
                {(creator as Profile).display_name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-dark-muted">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {totalDramas} 作品
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  {totalViews.toLocaleString()} 回視聴
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 公開作品一覧 */}
      <section>
        <h2 className="text-xl font-bold mb-6">
          公開作品
          <span className="text-dark-muted text-sm font-normal ml-2">
            ({totalDramas}件)
          </span>
        </h2>

        {dramas && dramas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dramas.map((drama: Drama) => (
              <DramaCard key={drama.id} drama={drama} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
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
            <p className="text-dark-muted text-lg">公開作品はまだありません</p>
          </div>
        )}
      </section>

      {/* ホームへ戻る */}
      <div className="mt-10 text-center">
        <Link
          href="/"
          className="text-accent hover:underline text-sm"
        >
          ← ホームに戻る
        </Link>
      </div>
    </div>
  );
}
