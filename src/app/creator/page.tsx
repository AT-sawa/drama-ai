"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Drama } from "@/lib/types";
import { GENRE_LABELS, GENRES } from "@/lib/types";

export default function CreatorDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDrama, setShowNewDrama] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newGenre, setNewGenre] = useState("drama");
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState({ totalViews: 0, totalRevenue: 0 });

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

      const { data: dramaList } = await supabase
        .from("dramas")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (dramaList) setDramas(dramaList);

      // 統計取得
      try {
        const res = await fetch("/api/creator/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {}

      setLoading(false);
    }
    load();
  }, []);

  async function handleCreateDrama() {
    if (!newTitle.trim() || !profile) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("dramas")
      .insert({
        creator_id: profile.id,
        title: newTitle.trim(),
        description: newDesc.trim(),
        genre: newGenre,
        is_published: true,
      })
      .select()
      .single();

    if (data) {
      setDramas([data, ...dramas]);
      setShowNewDrama(false);
      setNewTitle("");
      setNewDesc("");
      setNewGenre("drama");
    }
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">クリエイターダッシュボード</h1>
        <button
          onClick={() => setShowNewDrama(true)}
          className="bg-accent hover:bg-accent-hover text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          新しいドラマ
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <p className="text-dark-muted text-sm">作品数</p>
          <p className="text-3xl font-bold mt-1">{dramas.length}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <p className="text-dark-muted text-sm">総視聴数</p>
          <p className="text-3xl font-bold mt-1">
            {stats.totalViews.toLocaleString()}
          </p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <p className="text-dark-muted text-sm">収益（コイン）</p>
          <p className="text-3xl font-bold mt-1 text-coin">
            {stats.totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 新規ドラマ作成モーダル */}
      {showNewDrama && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">新しいドラマを作成</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-muted mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition"
                  placeholder="ドラマのタイトル"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-muted mb-1">
                  説明
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition resize-none"
                  placeholder="ドラマの説明"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-muted mb-1">
                  ジャンル
                </label>
                <select
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {GENRE_LABELS[g]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNewDrama(false)}
                  className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateDrama}
                  disabled={creating || !newTitle.trim()}
                  className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  {creating ? "作成中..." : "作成する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ドラマ一覧 */}
      <h2 className="text-xl font-bold mb-4">あなたの作品</h2>
      {dramas.length > 0 ? (
        <div className="space-y-4">
          {dramas.map((drama) => (
            <div
              key={drama.id}
              className="bg-dark-card border border-dark-border rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg truncate">{drama.title}</h3>
                  <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full">
                    {GENRE_LABELS[drama.genre] || drama.genre}
                  </span>
                  {drama.is_published ? (
                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                      公開中
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-dark-border text-dark-muted rounded-full">
                      下書き
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark-muted truncate">
                  {drama.description || "説明なし"}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-dark-muted">
                  <span>{drama.total_episodes} エピソード</span>
                  <span>{drama.total_views} 回視聴</span>
                </div>
              </div>
              <Link
                href={`/creator/generate?drama=${drama.id}`}
                className="ml-4 bg-accent/10 hover:bg-accent/20 text-accent px-4 py-2 rounded-lg transition text-sm font-medium flex-shrink-0"
              >
                エピソード追加
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-dark-card border border-dark-border rounded-xl">
          <p className="text-dark-muted mb-4">まだ作品がありません</p>
          <button
            onClick={() => setShowNewDrama(true)}
            className="text-accent hover:underline"
          >
            最初のドラマを作成しましょう
          </button>
        </div>
      )}
    </div>
  );
}
