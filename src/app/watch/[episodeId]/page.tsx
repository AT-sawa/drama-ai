"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { Episode, Drama, Profile } from "@/lib/types";

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const episodeId = params.episodeId as string;
  const supabase = createClient();

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [drama, setDrama] = useState<Drama | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // ユーザー確認
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // プロフィール取得
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      // エピソード取得
      const { data: ep } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", episodeId)
        .single();

      if (!ep) {
        setError("エピソードが見つかりません");
        setLoading(false);
        return;
      }
      setEpisode(ep);

      // ドラマ取得
      const { data: dr } = await supabase
        .from("dramas")
        .select("*")
        .eq("id", ep.drama_id)
        .single();
      if (dr) setDrama(dr);

      // 視聴済みか確認
      const { data: views } = await supabase
        .from("views")
        .select("id")
        .eq("user_id", user.id)
        .eq("episode_id", episodeId);

      if ((views && views.length > 0) || ep.is_free || ep.coin_price === 0) {
        setHasAccess(true);
      }

      setLoading(false);
    }
    load();
  }, [episodeId]);

  async function handlePurchaseView() {
    if (!episode || !profile) return;
    setPurchasing(true);
    setError(null);

    try {
      const res = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episodeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "視聴の購入に失敗しました");
      }

      setHasAccess(true);
      setProfile((prev) =>
        prev ? { ...prev, coin_balance: data.balance } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !episode) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-accent hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!episode) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* パンくず */}
      {drama && (
        <div className="flex items-center gap-2 text-sm text-dark-muted mb-4">
          <Link href="/" className="hover:text-dark-text transition">
            ホーム
          </Link>
          <span>/</span>
          <Link
            href={`/drama/${drama.id}`}
            className="hover:text-dark-text transition"
          >
            {drama.title}
          </Link>
          <span>/</span>
          <span className="text-dark-text">EP.{episode.episode_number}</span>
        </div>
      )}

      {/* 動画プレイヤー or 購入画面 */}
      {hasAccess ? (
        <VideoPlayer
          videoUrl={episode.video_url}
          cloudflareVideoId={episode.cloudflare_video_id}
          title={episode.title}
        />
      ) : (
        <div className="aspect-video bg-dark-card border border-dark-border rounded-xl flex items-center justify-center">
          <div className="text-center px-4">
            <svg
              className="w-16 h-16 mx-auto text-coin mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="text-lg font-bold mb-2">
              このエピソードは有料です
            </p>
            <p className="text-dark-muted mb-4">
              視聴には{" "}
              <span className="text-coin font-bold">
                {episode.coin_price} コイン
              </span>{" "}
              が必要です
            </p>
            {profile && profile.coin_balance < episode.coin_price ? (
              <div className="space-y-3">
                <p className="text-sm text-red-400">
                  コインが不足しています（残高: {profile.coin_balance}コイン）
                </p>
                <Link
                  href="/coins"
                  className="inline-block bg-coin text-dark-bg font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition"
                >
                  コインを購入
                </Link>
              </div>
            ) : (
              <button
                onClick={handlePurchaseView}
                disabled={purchasing}
                className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg transition"
              >
                {purchasing
                  ? "処理中..."
                  : `${episode.coin_price} コインで視聴する`}
              </button>
            )}
            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}
          </div>
        </div>
      )}

      {/* エピソード情報 */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold">
          EP.{episode.episode_number} - {episode.title}
        </h1>
        {episode.description && (
          <p className="mt-3 text-dark-muted leading-relaxed">
            {episode.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-sm text-dark-muted">
          {episode.duration > 0 && (
            <span>
              {Math.floor(episode.duration / 60)}:
              {String(episode.duration % 60).padStart(2, "0")}
            </span>
          )}
          <span>{episode.view_count.toLocaleString()} 回視聴</span>
        </div>
      </div>
    </div>
  );
}
