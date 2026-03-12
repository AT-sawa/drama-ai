"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Drama } from "@/lib/types";
import { GENRE_LABELS, GENRES } from "@/lib/types";
import { ThumbnailUpload } from "@/components/ThumbnailUpload";
import { VideoFrameCapture } from "@/components/VideoFrameCapture";

interface Episode {
  id: string;
  episode_number: number;
  title: string;
  video_url: string | null;
}

export default function CreatorDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalViews: 0, totalRevenue: 0 });

  // 新規ドラマ作成
  const [showNewDrama, setShowNewDrama] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newGenre, setNewGenre] = useState("drama");
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [newThumbnailPreview, setNewThumbnailPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // サムネイル変更モーダル
  const [editingDrama, setEditingDrama] = useState<Drama | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
  const [editEpisodes, setEditEpisodes] = useState<Episode[]>([]);
  const [showFrameCapture, setShowFrameCapture] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // 新規作成時のサムネイル選択
  const handleNewThumbnailSelect = useCallback((file: File | null) => {
    setNewThumbnailFile(file);
    if (file) {
      setNewThumbnailPreview(URL.createObjectURL(file));
    } else {
      setNewThumbnailPreview(null);
    }
  }, []);

  // 編集時のサムネイル選択
  const handleEditThumbnailSelect = useCallback((file: File | null) => {
    setEditThumbnailFile(file);
    if (file) {
      setEditThumbnailPreview(URL.createObjectURL(file));
    } else {
      setEditThumbnailPreview(null);
    }
  }, []);

  // サムネイルをAPIにアップロード
  async function uploadThumbnail(
    file: File | Blob,
    dramaId: string
  ): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file, file instanceof File ? file.name : "capture.jpg");
    formData.append("drama_id", dramaId);

    const res = await fetch("/api/upload/thumbnail", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return data.thumbnail_url;
    }
    return null;
  }

  // ドラマ作成
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
      // サムネイルがあればアップロード
      if (newThumbnailFile) {
        const thumbnailUrl = await uploadThumbnail(newThumbnailFile, data.id);
        if (thumbnailUrl) {
          data.thumbnail_url = thumbnailUrl;
        }
      }

      setDramas([data, ...dramas]);
      setShowNewDrama(false);
      setNewTitle("");
      setNewDesc("");
      setNewGenre("drama");
      setNewThumbnailFile(null);
      setNewThumbnailPreview(null);
    }
    setCreating(false);
  }

  // サムネイル変更モーダルを開く
  async function openThumbnailEdit(drama: Drama) {
    setEditingDrama(drama);
    setEditThumbnailFile(null);
    setEditThumbnailPreview(null);
    setShowFrameCapture(false);

    // エピソード一覧を取得（動画フレームキャプチャ用）
    const { data: eps } = await supabase
      .from("episodes")
      .select("id, episode_number, title, video_url")
      .eq("drama_id", drama.id)
      .eq("is_published", true)
      .order("episode_number", { ascending: true });

    setEditEpisodes(eps || []);
  }

  // サムネイル変更を保存
  async function handleSaveThumbnail() {
    if (!editingDrama || !editThumbnailFile) return;
    setUploading(true);

    const thumbnailUrl = await uploadThumbnail(
      editThumbnailFile,
      editingDrama.id
    );

    if (thumbnailUrl) {
      setDramas(
        dramas.map((d) =>
          d.id === editingDrama.id
            ? { ...d, thumbnail_url: thumbnailUrl }
            : d
        )
      );
      setEditingDrama(null);
    }
    setUploading(false);
  }

  // 動画フレームキャプチャ完了
  function handleFrameCapture(blob: Blob) {
    setShowFrameCapture(false);
    const file = new File([blob], "frame-capture.jpg", {
      type: "image/jpeg",
    });
    setEditThumbnailFile(file);
    setEditThumbnailPreview(URL.createObjectURL(blob));
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
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

              {/* サムネイル */}
              <div>
                <label className="block text-sm text-dark-muted mb-1">
                  サムネイル（任意）
                </label>
                <ThumbnailUpload
                  currentUrl={null}
                  previewUrl={newThumbnailPreview}
                  onFileSelect={handleNewThumbnailSelect}
                  disabled={creating}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowNewDrama(false);
                    setNewThumbnailFile(null);
                    setNewThumbnailPreview(null);
                  }}
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

      {/* サムネイル変更モーダル */}
      {editingDrama && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">サムネイル変更</h2>
            <p className="text-sm text-dark-muted mb-4">{editingDrama.title}</p>

            {showFrameCapture ? (
              <VideoFrameCapture
                episodes={editEpisodes}
                onCapture={handleFrameCapture}
                onClose={() => setShowFrameCapture(false)}
              />
            ) : (
              <div className="space-y-4">
                {/* 画像アップロード */}
                <div>
                  <label className="block text-sm text-dark-muted mb-1">
                    画像をアップロード
                  </label>
                  <ThumbnailUpload
                    currentUrl={editingDrama.thumbnail_url}
                    previewUrl={editThumbnailPreview}
                    onFileSelect={handleEditThumbnailSelect}
                    disabled={uploading}
                  />
                </div>

                {/* 動画フレームキャプチャ */}
                {editEpisodes.some((ep) => ep.video_url) && (
                  <button
                    type="button"
                    onClick={() => setShowFrameCapture(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dark-border rounded-lg text-sm text-dark-muted hover:text-dark-text hover:border-accent/50 transition"
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
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    動画からフレームをキャプチャ
                  </button>
                )}

                {/* ボタン */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditingDrama(null);
                      setEditThumbnailFile(null);
                      setEditThumbnailPreview(null);
                    }}
                    className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveThumbnail}
                    disabled={uploading || !editThumbnailFile}
                    className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
                  >
                    {uploading ? "アップロード中..." : "保存する"}
                  </button>
                </div>
              </div>
            )}
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
              className="bg-dark-card border border-dark-border rounded-xl p-5 flex items-center gap-4"
            >
              {/* サムネイル */}
              <button
                onClick={() => openThumbnailEdit(drama)}
                className="w-28 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-dark-border relative group"
                title="サムネイルを変更"
              >
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
                      className="w-6 h-6 text-accent/40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </button>

              {/* ドラマ情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg truncate">{drama.title}</h3>
                  <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full flex-shrink-0">
                    {GENRE_LABELS[drama.genre] || drama.genre}
                  </span>
                  {drama.is_published ? (
                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full flex-shrink-0">
                      公開中
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-dark-border text-dark-muted rounded-full flex-shrink-0">
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

              {/* アクションボタン */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/creator/generate?drama=${drama.id}`}
                  className="bg-accent/10 hover:bg-accent/20 text-accent px-4 py-2 rounded-lg transition text-sm font-medium"
                >
                  エピソード追加
                </Link>
              </div>
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
