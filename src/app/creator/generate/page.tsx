"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GenerateForm } from "@/components/GenerateForm";
import type { Profile, Drama, Episode } from "@/lib/types";

function GeneratePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dramaId = searchParams.get("drama");
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [drama, setDrama] = useState<Drama | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!prof?.is_creator) {
        router.push("/");
        return;
      }
      setProfile(prof);

      if (dramaId) {
        const { data: dr } = await supabase
          .from("dramas")
          .select("*")
          .eq("id", dramaId)
          .eq("creator_id", user.id)
          .single();

        if (dr) {
          setDrama(dr);

          const { data: eps } = await supabase
            .from("episodes")
            .select("*")
            .eq("drama_id", dramaId)
            .order("episode_number", { ascending: false });

          if (eps) setEpisodes(eps);
        }
      }

      setLoading(false);
    }
    load();
  }, [dramaId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!drama) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-dark-muted mb-4">
            ドラマが選択されていません
          </p>
          <Link
            href="/creator"
            className="text-accent hover:underline"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  const nextEpisodeNumber = episodes.length > 0 ? episodes[0].episode_number + 1 : 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-sm text-dark-muted mb-6">
        <Link href="/creator" className="hover:text-dark-text transition">
          ダッシュボード
        </Link>
        <span>/</span>
        <span className="text-dark-text">{drama.title}</span>
        <span>/</span>
        <span className="text-dark-text">AI動画生成</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        {drama.title} - 新しいエピソード
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 生成フォーム */}
        <GenerateForm
          dramaId={drama.id}
          episodeNumber={nextEpisodeNumber}
          coinBalance={profile?.coin_balance || 0}
        />

        {/* 既存エピソード一覧 */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">
            既存エピソード ({episodes.length})
          </h3>
          {episodes.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {episodes
                .sort((a, b) => a.episode_number - b.episode_number)
                .map((ep) => (
                  <div
                    key={ep.id}
                    className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"
                  >
                    <div>
                      <span className="text-xs text-dark-muted">
                        EP.{ep.episode_number}
                      </span>
                      <p className="text-sm font-medium">{ep.title}</p>
                    </div>
                    <div className="text-xs text-dark-muted">
                      {ep.view_count} 回視聴
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-dark-muted text-sm text-center py-8">
              まだエピソードがありません。
              <br />
              最初のエピソードをAIで生成しましょう！
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <GeneratePageContent />
    </Suspense>
  );
}
