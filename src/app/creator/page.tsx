"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Drama, Episode } from "@/lib/types";
import { GENRE_LABELS, GENRES } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { ThumbnailUpload } from "@/components/ThumbnailUpload";
import { VideoFrameCapture } from "@/components/VideoFrameCapture";
import { VideoUploadModal } from "@/components/VideoUploadModal";

interface FrameCaptureEpisode {
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

  // ドラマサムネイル変更モーダル
  const [editingDramaThumbnail, setEditingDramaThumbnail] = useState<Drama | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
  const [frameCaptureEpisodes, setFrameCaptureEpisodes] = useState<FrameCaptureEpisode[]>([]);
  const [showFrameCapture, setShowFrameCapture] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // エピソード展開
  const [expandedDramaId, setExpandedDramaId] = useState<string | null>(null);
  const [dramaEpisodes, setDramaEpisodes] = useState<Record<string, Episode[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // ドラマ編集モーダル
  const [editingDrama, setEditingDrama] = useState<Drama | null>(null);
  const [editDramaTitle, setEditDramaTitle] = useState("");
  const [editDramaDesc, setEditDramaDesc] = useState("");
  const [editDramaGenre, setEditDramaGenre] = useState("drama");
  const [savingDrama, setSavingDrama] = useState(false);

  // ドラマ削除確認
  const [deletingDrama, setDeletingDrama] = useState<Drama | null>(null);
  const [deletingDramaLoading, setDeletingDramaLoading] = useState(false);

  // エピソード編集モーダル
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [editEpTitle, setEditEpTitle] = useState("");
  const [editEpDesc, setEditEpDesc] = useState("");
  const [savingEpisode, setSavingEpisode] = useState(false);

  // エピソード削除確認
  const [deletingEpisode, setDeletingEpisode] = useState<Episode | null>(null);
  const [deletingEpisodeLoading, setDeletingEpisodeLoading] = useState(false);
  const [uploadingDrama, setUploadingDrama] = useState<Drama | null>(null);

  // エピソードサムネイル変更
  const [editingEpThumbnail, setEditingEpThumbnail] = useState<Episode | null>(null);
  const [editEpThumbnailFile, setEditEpThumbnailFile] = useState<File | null>(null);
  const [editEpThumbnailPreview, setEditEpThumbnailPreview] = useState<string | null>(null);
  const [showEpFrameCapture, setShowEpFrameCapture] = useState(false);
  const [uploadingEpThumbnail, setUploadingEpThumbnail] = useState(false);

  // エピソード延長（Extend）
  const [extendingEpisode, setExtendingEpisode] = useState<Episode | null>(null);
  const [extendMode, setExtendMode] = useState<"select" | "ai" | "upload">("select");
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendStatus, setExtendStatus] = useState<string | null>(null);
  const [extendFile, setExtendFile] = useState<File | null>(null);
  const [extendUploading, setExtendUploading] = useState(false);

  // エピソード音声（BGM）
  const [editingAudioEp, setEditingAudioEp] = useState<Episode | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [episodeAudioMap, setEpisodeAudioMap] = useState<Record<string, string>>({});

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

  // ====== サムネイルアップロード共通 ======
  async function uploadThumbnail(
    file: File | Blob,
    opts: { dramaId?: string; episodeId?: string }
  ): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file, file instanceof File ? file.name : "capture.jpg");
    if (opts.dramaId) formData.append("drama_id", opts.dramaId);
    if (opts.episodeId) formData.append("episode_id", opts.episodeId);

    try {
      const res = await fetch("/api/upload/thumbnail", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadError(null);
        return data.thumbnail_url;
      } else {
        setUploadError(data.error || "アップロードに失敗しました");
        return null;
      }
    } catch {
      setUploadError("ネットワークエラーが発生しました");
      return null;
    }
  }

  // ====== 新規ドラマ作成 ======
  const handleNewThumbnailSelect = useCallback((file: File | null) => {
    setNewThumbnailFile(file);
    setNewThumbnailPreview(file ? URL.createObjectURL(file) : null);
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
      if (newThumbnailFile) {
        const url = await uploadThumbnail(newThumbnailFile, { dramaId: data.id });
        if (url) data.thumbnail_url = url;
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

  // ====== ドラマサムネイル変更 ======
  const handleEditThumbnailSelect = useCallback((file: File | null) => {
    setEditThumbnailFile(file);
    setEditThumbnailPreview(file ? URL.createObjectURL(file) : null);
  }, []);

  async function openDramaThumbnailEdit(drama: Drama) {
    setEditingDramaThumbnail(drama);
    setEditThumbnailFile(null);
    setEditThumbnailPreview(null);
    setShowFrameCapture(false);
    setUploadError(null);

    const { data: eps } = await supabase
      .from("episodes")
      .select("id, episode_number, title, video_url")
      .eq("drama_id", drama.id)
      .eq("is_published", true)
      .order("episode_number", { ascending: true });

    setFrameCaptureEpisodes(eps || []);
  }

  async function handleSaveDramaThumbnail() {
    if (!editingDramaThumbnail || !editThumbnailFile) return;
    setUploading(true);
    setUploadError(null);

    const url = await uploadThumbnail(editThumbnailFile, { dramaId: editingDramaThumbnail.id });
    if (url) {
      setDramas(dramas.map((d) =>
        d.id === editingDramaThumbnail.id ? { ...d, thumbnail_url: url } : d
      ));
      setEditingDramaThumbnail(null);
    }
    setUploading(false);
  }

  function handleDramaFrameCapture(blob: Blob) {
    setShowFrameCapture(false);
    const file = new File([blob], "frame-capture.jpg", { type: "image/jpeg" });
    setEditThumbnailFile(file);
    setEditThumbnailPreview(URL.createObjectURL(blob));
  }

  // ====== エピソード一覧展開 ======
  async function toggleEpisodes(dramaId: string) {
    if (expandedDramaId === dramaId) {
      setExpandedDramaId(null);
      return;
    }
    setExpandedDramaId(dramaId);
    if (!dramaEpisodes[dramaId]) {
      setLoadingEpisodes(true);
      const { data: eps } = await supabase
        .from("episodes")
        .select("*")
        .eq("drama_id", dramaId)
        .order("episode_number", { ascending: true });

      setDramaEpisodes((prev) => ({ ...prev, [dramaId]: eps || [] }));
      setLoadingEpisodes(false);
    }
  }

  // ====== ドラマ編集 ======
  function openEditDrama(drama: Drama) {
    setEditingDrama(drama);
    setEditDramaTitle(drama.title);
    setEditDramaDesc(drama.description);
    setEditDramaGenre(drama.genre);
  }

  async function handleSaveDrama() {
    if (!editingDrama || !editDramaTitle.trim()) return;
    setSavingDrama(true);

    const { error } = await supabase
      .from("dramas")
      .update({
        title: editDramaTitle.trim(),
        description: editDramaDesc.trim(),
        genre: editDramaGenre,
      })
      .eq("id", editingDrama.id);

    if (!error) {
      setDramas(dramas.map((d) =>
        d.id === editingDrama.id
          ? { ...d, title: editDramaTitle.trim(), description: editDramaDesc.trim(), genre: editDramaGenre }
          : d
      ));
      setEditingDrama(null);
    }
    setSavingDrama(false);
  }

  // ====== ドラマ削除 ======
  async function handleDeleteDrama() {
    if (!deletingDrama) return;
    setDeletingDramaLoading(true);

    const { error } = await supabase
      .from("dramas")
      .delete()
      .eq("id", deletingDrama.id);

    if (!error) {
      setDramas(dramas.filter((d) => d.id !== deletingDrama.id));
      if (expandedDramaId === deletingDrama.id) setExpandedDramaId(null);
      setDeletingDrama(null);
    }
    setDeletingDramaLoading(false);
  }

  // ====== エピソード編集 ======
  function openEditEpisode(ep: Episode) {
    setEditingEpisode(ep);
    setEditEpTitle(ep.title);
    setEditEpDesc(ep.description);
  }

  async function handleSaveEpisode() {
    if (!editingEpisode || !editEpTitle.trim()) return;
    setSavingEpisode(true);

    const { error } = await supabase
      .from("episodes")
      .update({
        title: editEpTitle.trim(),
        description: editEpDesc.trim(),
      })
      .eq("id", editingEpisode.id);

    if (!error) {
      const dramaId = editingEpisode.drama_id;
      setDramaEpisodes((prev) => ({
        ...prev,
        [dramaId]: (prev[dramaId] || []).map((e) =>
          e.id === editingEpisode.id
            ? { ...e, title: editEpTitle.trim(), description: editEpDesc.trim() }
            : e
        ),
      }));
      setEditingEpisode(null);
    }
    setSavingEpisode(false);
  }

  // ====== エピソード延長（Extend） ======
  async function handleExtendEpisode() {
    if (!extendingEpisode) return;
    setExtendLoading(true);
    setExtendStatus("延長タスクを送信中...");

    try {
      const res = await fetch("/api/generate/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: extendingEpisode.id,
          prompt: extendPrompt || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setExtendStatus(`エラー: ${data.error}`);
        setExtendLoading(false);
        return;
      }

      const taskId = data.task_id;
      const episodeId = extendingEpisode.id;
      setExtendStatus("Kling AIが動画を延長中...");

      // ポーリングで完了を待つ
      let attempts = 0;
      const maxAttempts = 120;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(
            `/api/generate/status?task_id=${taskId}&episode_id=${episodeId}`
          );
          const statusData = await statusRes.json();

          if (statusData.status === "succeed") {
            clearInterval(poll);
            setExtendStatus("延長完了！動画が更新されました。");
            // エピソードリストを更新
            const dramaId = extendingEpisode.drama_id;
            const { data: eps } = await supabase
              .from("episodes")
              .select("*")
              .eq("drama_id", dramaId)
              .order("episode_number", { ascending: true });
            setDramaEpisodes((prev) => ({ ...prev, [dramaId]: eps || [] }));
            setExtendLoading(false);
            setTimeout(() => {
              setExtendingEpisode(null);
              setExtendStatus(null);
              setExtendPrompt("");
            }, 2000);
          } else if (statusData.status === "failed") {
            clearInterval(poll);
            setExtendStatus(`延長失敗: ${statusData.error || "不明なエラー"}`);
            setExtendLoading(false);
          } else {
            const min = Math.floor((attempts * 10) / 60);
            const sec = (attempts * 10) % 60;
            const timeStr = min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
            setExtendStatus(`Kling AIが動画を延長中... (${timeStr}経過)`);
          }
        } catch {
          // ネットワークエラーは無視して再試行
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setExtendStatus("タイムアウト: 処理に時間がかかっています。後で確認してください。");
          setExtendLoading(false);
        }
      }, 10000);
    } catch {
      setExtendStatus("予期しないエラーが発生しました。");
      setExtendLoading(false);
    }
  }

  // ====== エピソード削除 ======
  async function handleDeleteEpisode() {
    if (!deletingEpisode) return;
    setDeletingEpisodeLoading(true);

    const dramaId = deletingEpisode.drama_id;
    const { error } = await supabase
      .from("episodes")
      .delete()
      .eq("id", deletingEpisode.id);

    if (!error) {
      setDramaEpisodes((prev) => ({
        ...prev,
        [dramaId]: (prev[dramaId] || []).filter((e) => e.id !== deletingEpisode.id),
      }));
      // total_episodes をDBの実カウントで更新
      const { count } = await supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("drama_id", dramaId)
        .eq("is_published", true);
      const newCount = count || 0;
      await supabase.from("dramas").update({ total_episodes: newCount }).eq("id", dramaId);
      setDramas(dramas.map((d) =>
        d.id === dramaId ? { ...d, total_episodes: newCount } : d
      ));
      setDeletingEpisode(null);
    }
    setDeletingEpisodeLoading(false);
  }

  // ====== エピソードサムネイル ======
  const handleEditEpThumbnailSelect = useCallback((file: File | null) => {
    setEditEpThumbnailFile(file);
    setEditEpThumbnailPreview(file ? URL.createObjectURL(file) : null);
  }, []);

  function openEpThumbnailEdit(ep: Episode) {
    setEditingEpThumbnail(ep);
    setEditEpThumbnailFile(null);
    setEditEpThumbnailPreview(null);
    setShowEpFrameCapture(false);
    setUploadError(null);
  }

  async function handleSaveEpThumbnail() {
    if (!editingEpThumbnail || !editEpThumbnailFile) return;
    setUploadingEpThumbnail(true);
    setUploadError(null);

    const url = await uploadThumbnail(editEpThumbnailFile, { episodeId: editingEpThumbnail.id });
    if (url) {
      const dramaId = editingEpThumbnail.drama_id;
      setDramaEpisodes((prev) => ({
        ...prev,
        [dramaId]: (prev[dramaId] || []).map((e) =>
          e.id === editingEpThumbnail.id ? { ...e, thumbnail_url: url } : e
        ),
      }));
      setEditingEpThumbnail(null);
    }
    setUploadingEpThumbnail(false);
  }

  function handleEpFrameCapture(blob: Blob) {
    setShowEpFrameCapture(false);
    const file = new File([blob], "ep-frame-capture.jpg", { type: "image/jpeg" });
    setEditEpThumbnailFile(file);
    setEditEpThumbnailPreview(URL.createObjectURL(blob));
  }

  // ====== エピソード音声（BGM） ======
  async function checkEpisodeAudio(episodeId: string) {
    try {
      const res = await fetch(`/api/audio/${episodeId}`);
      const data = await res.json();
      if (data.audio_url) {
        setEpisodeAudioMap((prev) => ({ ...prev, [episodeId]: data.audio_url }));
      }
    } catch {}
  }

  function openAudioEdit(ep: Episode) {
    setEditingAudioEp(ep);
    setAudioFile(null);
    setAudioError(null);
    checkEpisodeAudio(ep.id);
  }

  async function handleUploadAudio() {
    if (!editingAudioEp || !audioFile) return;
    setUploadingAudio(true);
    setAudioError(null);

    try {
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("episode_id", editingAudioEp.id);

      const res = await fetch("/api/upload/audio", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEpisodeAudioMap((prev) => ({ ...prev, [editingAudioEp.id]: data.audio_url }));
      setEditingAudioEp(null);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploadingAudio(false);
    }
  }

  async function handleDeleteAudio() {
    if (!editingAudioEp) return;
    setUploadingAudio(true);
    setAudioError(null);

    try {
      const res = await fetch("/api/upload/audio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: editingAudioEp.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setEpisodeAudioMap((prev) => {
        const next = { ...prev };
        delete next[editingAudioEp.id];
        return next;
      });
      setEditingAudioEp(null);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setUploadingAudio(false);
    }
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新しいドラマ
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 md:p-6 text-center md:text-left">
          <p className="text-dark-muted text-xs md:text-sm">作品数</p>
          <p className="text-xl md:text-3xl font-bold mt-0.5 md:mt-1">{dramas.length}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 md:p-6 text-center md:text-left">
          <p className="text-dark-muted text-xs md:text-sm">総視聴数</p>
          <p className="text-xl md:text-3xl font-bold mt-0.5 md:mt-1">{formatNumber(stats.totalViews)}</p>
        </div>
        <Link href="/creator/payout" className="bg-dark-card border border-dark-border rounded-xl p-3 md:p-6 text-center md:text-left hover:border-green-500/50 transition group">
          <p className="text-dark-muted text-xs md:text-sm truncate">収益（コイン）</p>
          <p className="text-xl md:text-3xl font-bold mt-0.5 md:mt-1 text-coin">{formatNumber(stats.totalRevenue)}</p>
          <p className="text-xs text-green-400/70 group-hover:text-green-400 mt-1 hidden md:block">振込申請 →</p>
        </Link>
      </div>

      {/* ====== 新規ドラマ作成モーダル ====== */}
      {showNewDrama && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">新しいドラマを作成</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-muted mb-1">タイトル</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition"
                  placeholder="ドラマのタイトル"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-muted mb-1">説明</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition resize-none"
                  placeholder="ドラマの説明"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-muted mb-1">ジャンル</label>
                <select
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{GENRE_LABELS[g]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-dark-muted mb-1">サムネイル（任意）</label>
                <ThumbnailUpload
                  currentUrl={null}
                  previewUrl={newThumbnailPreview}
                  onFileSelect={handleNewThumbnailSelect}
                  disabled={creating}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowNewDrama(false); setNewThumbnailFile(null); setNewThumbnailPreview(null); }}
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

      {/* ====== ドラマサムネイル変更モーダル ====== */}
      {editingDramaThumbnail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">サムネイル変更</h2>
            <p className="text-sm text-dark-muted mb-4">{editingDramaThumbnail.title}</p>

            {showFrameCapture ? (
              <VideoFrameCapture
                episodes={frameCaptureEpisodes}
                onCapture={handleDramaFrameCapture}
                onClose={() => setShowFrameCapture(false)}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-muted mb-1">画像をアップロード</label>
                  <ThumbnailUpload
                    currentUrl={editingDramaThumbnail.thumbnail_url}
                    previewUrl={editThumbnailPreview}
                    onFileSelect={handleEditThumbnailSelect}
                    disabled={uploading}
                  />
                </div>
                {frameCaptureEpisodes.some((ep) => ep.video_url) && (
                  <button
                    type="button"
                    onClick={() => setShowFrameCapture(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dark-border rounded-lg text-sm text-dark-muted hover:text-dark-text hover:border-accent/50 transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    動画からフレームをキャプチャ
                  </button>
                )}
                {uploadError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {uploadError}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setEditingDramaThumbnail(null); setUploadError(null); }}
                    className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveDramaThumbnail}
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

      {/* ====== ドラマ編集モーダル ====== */}
      {editingDrama && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">ドラマを編集</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-muted mb-1">タイトル</label>
                <input
                  type="text"
                  value={editDramaTitle}
                  onChange={(e) => setEditDramaTitle(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-muted mb-1">説明</label>
                <textarea
                  value={editDramaDesc}
                  onChange={(e) => setEditDramaDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-muted mb-1">ジャンル</label>
                <select
                  value={editDramaGenre}
                  onChange={(e) => setEditDramaGenre(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{GENRE_LABELS[g]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingDrama(null)}
                  className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveDrama}
                  disabled={savingDrama || !editDramaTitle.trim()}
                  className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  {savingDrama ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== ドラマ削除確認 ====== */}
      {deletingDrama && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2 text-red-400">ドラマを削除</h2>
            <p className="text-sm text-dark-muted mb-1">
              「{deletingDrama.title}」を削除しますか？
            </p>
            <p className="text-sm text-red-400/80 mb-4">
              すべてのエピソードも一緒に削除されます。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingDrama(null)}
                className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteDrama}
                disabled={deletingDramaLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {deletingDramaLoading ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== エピソード編集モーダル ====== */}
      {editingEpisode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">エピソードを編集</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-muted mb-1">タイトル</label>
                <input
                  type="text"
                  value={editEpTitle}
                  onChange={(e) => setEditEpTitle(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-muted mb-1">説明</label>
                <textarea
                  value={editEpDesc}
                  onChange={(e) => setEditEpDesc(e.target.value)}
                  rows={4}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingEpisode(null)}
                  className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveEpisode}
                  disabled={savingEpisode || !editEpTitle.trim()}
                  className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  {savingEpisode ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== エピソード延長モーダル ====== */}
      {extendingEpisode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-bg border border-dark-border rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-1">動画を延長</h2>
            <p className="text-sm text-dark-muted mb-4">
              EP.{extendingEpisode.episode_number}「{extendingEpisode.title}」
            </p>

            {extendStatus && (
              <div className={`p-3 rounded-lg text-sm mb-4 ${
                extendStatus.includes("完了") ? "bg-green-500/10 border border-green-500/30 text-green-400" :
                extendStatus.includes("エラー") || extendStatus.includes("失敗") ? "bg-red-500/10 border border-red-500/30 text-red-400" :
                "bg-accent/10 border border-accent/30 text-accent"
              }`}>
                {extendStatus}
              </div>
            )}

            {/* ステップ1: モード選択 */}
            {extendMode === "select" && !extendLoading && (
              <div className="space-y-3 mb-4">
                <button
                  onClick={() => setExtendMode("ai")}
                  className="w-full p-4 bg-dark-card border border-dark-border rounded-xl text-left hover:border-accent/50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-dark-text group-hover:text-accent transition">AI延長</p>
                      <p className="text-xs text-dark-muted mt-0.5">
                        Kling AIが自動で続きを生成
                        <span className="text-accent ml-1">
                          {extendingEpisode.source === "upload" ? "（無料）" : "（300コイン）"}
                        </span>
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setExtendMode("upload")}
                  className="w-full p-4 bg-dark-card border border-dark-border rounded-xl text-left hover:border-green-500/50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-dark-text group-hover:text-green-400 transition">動画を追加</p>
                      <p className="text-xs text-dark-muted mt-0.5">
                        自分の動画をセグメントとして追加（連続再生）
                        <span className="text-green-400 ml-1">（無料）</span>
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* ステップ2a: AI延長 */}
            {extendMode === "ai" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-dark-muted mb-1">
                    延長部分のプロンプト（任意）
                  </label>
                  <textarea
                    value={extendPrompt}
                    onChange={(e) => setExtendPrompt(e.target.value)}
                    placeholder="空欄の場合、元のシーンの自然な続きが生成されます"
                    rows={3}
                    maxLength={2500}
                    disabled={extendLoading}
                    className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-accent resize-none disabled:opacity-50"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => extendLoading ? null : setExtendMode("select")}
                    disabled={extendLoading}
                    className="flex-1 px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm hover:bg-dark-border/50 transition disabled:opacity-50"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleExtendEpisode}
                    disabled={extendLoading}
                    className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-sm text-white font-medium transition"
                  >
                    {extendLoading ? "処理中..." : "AI延長を開始"}
                  </button>
                </div>
              </>
            )}

            {/* ステップ2b: 手動アップロード */}
            {extendMode === "upload" && (
              <>
                <div className="mb-4">
                  <input
                    type="file"
                    id="extend-upload-input"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 500 * 1024 * 1024) {
                          setExtendStatus("エラー: ファイルサイズは500MB以下にしてください");
                          return;
                        }
                        setExtendFile(f);
                        setExtendStatus(null);
                      }
                    }}
                    className="hidden"
                    disabled={extendUploading}
                  />
                  {extendFile ? (
                    <div className="border border-dark-border rounded-lg p-3 flex items-center gap-3">
                      <svg className="w-8 h-8 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark-text truncate">{extendFile.name}</p>
                        <p className="text-xs text-dark-muted">{(extendFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                      <button
                        onClick={() => { setExtendFile(null); const el = document.getElementById("extend-upload-input") as HTMLInputElement; if (el) el.value = ""; }}
                        disabled={extendUploading}
                        className="text-dark-muted hover:text-red-400 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => document.getElementById("extend-upload-input")?.click()}
                      className="w-full border-2 border-dashed border-dark-border rounded-lg p-6 text-center hover:border-green-500/50 transition group"
                    >
                      <svg className="w-8 h-8 mx-auto text-dark-muted group-hover:text-green-400 transition mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-xs text-dark-muted">MP4, MOV / 最大500MB</p>
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => extendUploading ? null : setExtendMode("select")}
                    disabled={extendUploading}
                    className="flex-1 px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm hover:bg-dark-border/50 transition disabled:opacity-50"
                  >
                    戻る
                  </button>
                  <button
                    onClick={async () => {
                      if (!extendFile || !extendingEpisode) return;
                      setExtendUploading(true);
                      try {
                        if (!extendingEpisode.video_url) throw new Error("元の動画URLが見つかりません");

                        // プレイリスト方式: 動画をアップロードしてセグメントとして追加
                        setExtendStatus("動画をアップロード中...");
                        const ext = extendFile.name.split(".").pop() || "mp4";
                        const path = `${profile?.id}/${extendingEpisode.drama_id}_seg_${Date.now()}.${ext}`;
                        const { error: upErr } = await supabase.storage.from("videos").upload(path, extendFile, { contentType: extendFile.type });
                        if (upErr) throw new Error("アップロード失敗: " + upErr.message);

                        // アップロードした動画のdurationを取得
                        setExtendStatus("動画情報を取得中...");
                        const segUrl = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
                        const segDuration = await new Promise<number>((resolve) => {
                          const v = document.createElement("video");
                          v.preload = "metadata";
                          v.src = URL.createObjectURL(extendFile);
                          v.onloadedmetadata = () => { resolve(v.duration); URL.revokeObjectURL(v.src); };
                          v.onerror = () => { resolve(0); URL.revokeObjectURL(v.src); };
                        });

                        // DBから最新のセグメントリストを取得（stateが古い可能性があるため）
                        setExtendStatus("エピソードを更新中...");
                        const { data: latestEp } = await supabase
                          .from("episodes")
                          .select("video_segments, video_url, duration")
                          .eq("id", extendingEpisode.id)
                          .single();
                        const currentSegments = latestEp?.video_segments || [];
                        // 初回延長の場合、元動画もセグメントに含める
                        let segments = [...currentSegments];
                        if (segments.length === 0 && (latestEp?.video_url || extendingEpisode.video_url)) {
                          segments.push({
                            url: latestEp?.video_url || extendingEpisode.video_url,
                            duration: Math.round(latestEp?.duration || extendingEpisode.duration || 0),
                          });
                        }
                        segments.push({
                          url: segUrl,
                          duration: Math.round(segDuration),
                        });

                        const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

                        const { error: updateErr } = await supabase
                          .from("episodes")
                          .update({
                            video_segments: segments,
                            duration: totalDuration,
                          })
                          .eq("id", extendingEpisode.id);
                        if (updateErr) throw new Error("DB更新失敗: " + updateErr.message);

                        setExtendStatus("完了！セグメントが追加されました。");
                        const dramaId = extendingEpisode.drama_id;
                        const { data: eps } = await supabase.from("episodes").select("*").eq("drama_id", dramaId).order("episode_number", { ascending: true });
                        setDramaEpisodes((prev) => ({ ...prev, [dramaId]: eps || [] }));
                        setTimeout(() => { setExtendingEpisode(null); setExtendStatus(null); setExtendFile(null); setExtendMode("select"); }, 2000);
                      } catch (err: any) {
                        console.error("[extend-upload] Error:", err);
                        setExtendStatus(`エラー: ${err.message}`);
                      } finally {
                        setExtendUploading(false);
                      }
                    }}
                    disabled={!extendFile || extendUploading}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition"
                  >
                    {extendUploading ? "処理中..." : "アップロードして追加"}
                  </button>
                </div>
              </>
            )}

            {/* モード選択画面のキャンセル */}
            {extendMode === "select" && !extendLoading && (
              <button
                onClick={() => { setExtendingEpisode(null); setExtendStatus(null); setExtendPrompt(""); setExtendMode("select"); setExtendFile(null); }}
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-dark-muted hover:bg-dark-border/50 transition"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      )}

      {/* ====== エピソード削除確認 ====== */}
      {deletingEpisode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2 text-red-400">エピソードを削除</h2>
            <p className="text-sm text-dark-muted mb-4">
              EP.{deletingEpisode.episode_number}「{deletingEpisode.title}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingEpisode(null)}
                className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteEpisode}
                disabled={deletingEpisodeLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {deletingEpisodeLoading ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== エピソードサムネイル変更モーダル ====== */}
      {editingEpThumbnail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">エピソードサムネイル変更</h2>
            <p className="text-sm text-dark-muted mb-4">
              EP.{editingEpThumbnail.episode_number} {editingEpThumbnail.title}
            </p>

            {showEpFrameCapture ? (
              <VideoFrameCapture
                episodes={editingEpThumbnail.video_url ? [{
                  id: editingEpThumbnail.id,
                  episode_number: editingEpThumbnail.episode_number,
                  title: editingEpThumbnail.title,
                  video_url: editingEpThumbnail.video_url,
                }] : []}
                onCapture={handleEpFrameCapture}
                onClose={() => setShowEpFrameCapture(false)}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-muted mb-1">画像をアップロード</label>
                  <ThumbnailUpload
                    currentUrl={editingEpThumbnail.thumbnail_url}
                    previewUrl={editEpThumbnailPreview}
                    onFileSelect={handleEditEpThumbnailSelect}
                    disabled={uploadingEpThumbnail}
                  />
                </div>
                {editingEpThumbnail.video_url && (
                  <button
                    type="button"
                    onClick={() => setShowEpFrameCapture(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dark-border rounded-lg text-sm text-dark-muted hover:text-dark-text hover:border-accent/50 transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    動画からフレームをキャプチャ
                  </button>
                )}
                {uploadError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {uploadError}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setEditingEpThumbnail(null); setUploadError(null); }}
                    className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveEpThumbnail}
                    disabled={uploadingEpThumbnail || !editEpThumbnailFile}
                    className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
                  >
                    {uploadingEpThumbnail ? "アップロード中..." : "保存する"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== BGM設定モーダル ====== */}
      {editingAudioEp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-1">BGM / 音声設定</h2>
            <p className="text-sm text-dark-muted mb-4">
              EP.{editingAudioEp.episode_number} {editingAudioEp.title}
            </p>

            {/* 現在のBGM状態 */}
            {episodeAudioMap[editingAudioEp.id] ? (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  <span className="text-sm text-green-400 font-medium">BGM設定済み</span>
                </div>
                <audio
                  src={episodeAudioMap[editingAudioEp.id]}
                  controls
                  className="w-full h-8"
                  style={{ filter: "invert(1)" }}
                />
                <button
                  onClick={handleDeleteAudio}
                  disabled={uploadingAudio}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 transition"
                >
                  BGMを削除
                </button>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-dark-border/30 border border-dark-border rounded-lg text-sm text-dark-muted">
                BGMが設定されていません
              </div>
            )}

            {/* ファイル選択 */}
            <div className="mb-4">
              <label className="block text-sm text-dark-muted mb-2">
                {episodeAudioMap[editingAudioEp.id] ? "BGMを変更" : "音声ファイルを選択"}
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setAudioFile(f);
                  setAudioError(null);
                }}
                className="w-full text-sm text-dark-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-dark-border file:text-dark-text file:cursor-pointer hover:file:bg-dark-border/70 file:transition"
              />
              <p className="text-xs text-dark-muted mt-1">
                対応形式: MP3, WAV, OGG, AAC, M4A（20MB以下）
              </p>
            </div>

            {audioFile && (
              <div className="mb-4 p-3 bg-dark-bg border border-dark-border rounded-lg">
                <p className="text-sm text-dark-text truncate">{audioFile.name}</p>
                <p className="text-xs text-dark-muted">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            )}

            {audioError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {audioError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditingAudioEp(null)}
                className="flex-1 bg-dark-border text-dark-text py-2.5 rounded-lg hover:bg-dark-border/70 transition"
              >
                閉じる
              </button>
              <button
                onClick={handleUploadAudio}
                disabled={uploadingAudio || !audioFile}
                className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {uploadingAudio ? "アップロード中..." : "アップロード"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== ドラマ一覧 ====== */}
      <h2 className="text-xl font-bold mb-4">あなたの作品</h2>
      {dramas.length > 0 ? (
        <div className="space-y-4">
          {dramas.map((drama) => {
            const isExpanded = expandedDramaId === drama.id;
            const episodes = dramaEpisodes[drama.id] || [];

            return (
              <div key={drama.id} className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
                <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
                  {/* サムネイル */}
                  <button
                    onClick={() => openDramaThumbnailEdit(drama)}
                    className="w-full sm:w-28 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-dark-border relative group"
                    title="サムネイルを変更"
                  >
                    {drama.thumbnail_url ? (
                      <Image src={drama.thumbnail_url} alt={drama.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-orange-900/20">
                        <svg className="w-6 h-6 text-accent/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </button>

                  {/* ドラマ情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                      <h3 className="font-bold text-base md:text-lg truncate">{drama.title}</h3>
                      <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full flex-shrink-0">
                        {GENRE_LABELS[drama.genre] || drama.genre}
                      </span>
                      {drama.is_published ? (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full flex-shrink-0">公開中</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-dark-border text-dark-muted rounded-full flex-shrink-0">下書き</span>
                      )}
                    </div>
                    <p className="text-sm text-dark-muted truncate">{drama.description || "説明なし"}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-dark-muted whitespace-nowrap">
                      <span>{drama.total_episodes} エピソード</span>
                      <span>{drama.total_views} 回視聴</span>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditDrama(drama)}
                        className="p-2 text-dark-muted hover:text-dark-text hover:bg-dark-border/50 rounded-lg transition"
                        title="編集"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingDrama(drama)}
                        className="p-2 text-dark-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="削除"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => setUploadingDrama(drama)}
                      className="bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 md:px-4 py-2 rounded-lg transition text-xs md:text-sm font-medium whitespace-nowrap"
                    >
                      動画アップロード
                    </button>
                    <Link
                      href={`/creator/generate?drama=${drama.id}`}
                      className="bg-accent/10 hover:bg-accent/20 text-accent px-3 md:px-4 py-2 rounded-lg transition text-xs md:text-sm font-medium whitespace-nowrap"
                    >
                      AI生成
                    </Link>
                  </div>
                </div>

                {/* エピソード展開ボタン */}
                <button
                  onClick={() => toggleEpisodes(drama.id)}
                  className="w-full px-5 py-2.5 border-t border-dark-border flex items-center justify-center gap-2 text-sm text-dark-muted hover:text-dark-text hover:bg-dark-border/20 transition"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  エピソード一覧 ({drama.total_episodes}件)
                </button>

                {/* エピソード一覧 */}
                {isExpanded && (
                  <div className="border-t border-dark-border">
                    {loadingEpisodes ? (
                      <div className="flex justify-center py-6">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : episodes.length > 0 ? (
                      <div className="divide-y divide-dark-border/50">
                        {episodes.map((ep) => (
                          <div key={ep.id} className="px-5 py-3 flex items-center gap-3">
                            {/* エピソードサムネイル */}
                            <button
                              onClick={() => openEpThumbnailEdit(ep)}
                              className="w-20 aspect-video flex-shrink-0 rounded-md overflow-hidden bg-dark-border relative group"
                              title="サムネイルを変更"
                            >
                              {ep.thumbnail_url ? (
                                <Image src={ep.thumbnail_url} alt={ep.title} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-5 h-5 text-dark-muted/40" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                            </button>

                            {/* エピソード情報 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-dark-muted">EP.{ep.episode_number}</span>
                                {ep.is_free && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">無料</span>
                                )}
                              </div>
                              <h4 className="font-medium text-sm truncate mt-0.5">{ep.title}</h4>
                              <div className="flex items-center gap-3 mt-1 text-xs text-dark-muted">
                                {ep.duration > 0 && (
                                  <span>{Math.floor(ep.duration / 60)}:{String(ep.duration % 60).padStart(2, "0")}</span>
                                )}
                                <span>{ep.view_count} 回視聴</span>
                              </div>
                            </div>

                            {/* エピソードアクション */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {ep.is_published && (ep.piapi_task_id || ep.video_url) && (
                                <button
                                  onClick={() => { setExtendingEpisode(ep); setExtendMode("select"); setExtendPrompt(""); setExtendStatus(null); setExtendFile(null); }}
                                  className="p-1.5 text-accent/60 hover:text-accent hover:bg-accent/10 rounded-lg transition"
                                  title={`動画を延長${ep.source === "upload" ? "（無料）" : "（300コイン）"}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => openAudioEdit(ep)}
                                className={`p-1.5 rounded-lg transition ${
                                  episodeAudioMap[ep.id]
                                    ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                    : "text-dark-muted hover:text-dark-text hover:bg-dark-border/50"
                                }`}
                                title="BGM設定"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openEditEpisode(ep)}
                                className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-border/50 rounded-lg transition"
                                title="編集"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeletingEpisode(ep)}
                                className="p-1.5 text-dark-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                title="削除"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-dark-muted">
                        エピソードはまだありません
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-dark-card border border-dark-border rounded-xl">
          <p className="text-dark-muted mb-4">まだ作品がありません</p>
          <button onClick={() => setShowNewDrama(true)} className="text-accent hover:underline">
            最初のドラマを作成しましょう
          </button>
        </div>
      )}
      {/* ====== 動画アップロードモーダル ====== */}
      {uploadingDrama && (
        <VideoUploadModal
          dramaId={uploadingDrama.id}
          dramaTitle={uploadingDrama.title}
          onClose={() => setUploadingDrama(null)}
          onSuccess={async () => {
            // エピソード一覧をリロード
            const { data: eps } = await supabase
              .from("episodes")
              .select("*")
              .eq("drama_id", uploadingDrama.id)
              .order("episode_number", { ascending: true });
            if (eps) {
              setDramaEpisodes((prev) => ({ ...prev, [uploadingDrama.id]: eps }));
            }
            // ドラマのエピソード数を更新
            setDramas(dramas.map((d) =>
              d.id === uploadingDrama.id
                ? { ...d, total_episodes: (eps?.length || d.total_episodes) }
                : d
            ));
          }}
        />
      )}
    </div>
  );
}
