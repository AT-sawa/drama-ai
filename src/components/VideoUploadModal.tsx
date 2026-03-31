"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface VideoUploadModalProps {
  dramaId: string;
  dramaTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = ["video/mp4", "video/quicktime"];

export function VideoUploadModal({
  dramaId,
  dramaTitle,
  onClose,
  onSuccess,
}: VideoUploadModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coinPrice, setCoinPrice] = useState(100);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "uploading" | "done">("form");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("対応形式: MP4, MOV のみ");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("ファイルサイズは500MB以下にしてください");
      return;
    }

    setFile(selected);
    setError(null);
    if (!title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ""));
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    setStep("uploading");
    setError(null);

    try {
      // 1. ユーザーID取得
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

      // 2. Supabase Storageに直接アップロード
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${dramaId}_${Date.now()}.${ext}`;

      setProgress(10);

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw new Error("動画のアップロードに失敗: " + uploadError.message);
      }

      setProgress(70);

      // 3. エピソード作成API呼び出し
      const res = await fetch("/api/episodes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drama_id: dramaId,
          title,
          description,
          coin_price: coinPrice,
          video_path: path,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "エピソード作成に失敗");

      setProgress(100);
      setStep("done");

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "アップロードに失敗しました");
      setStep("form");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={() => !uploading && onClose()}
    >
      <div
        className="bg-dark-bg border border-dark-border rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">動画をアップロード</h3>
          {!uploading && (
            <button
              onClick={onClose}
              className="text-dark-muted hover:text-dark-text transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <p className="text-sm text-dark-muted mb-4">
          「{dramaTitle}」にエピソードを追加
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        )}

        {step === "done" ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-400 font-medium">アップロード完了！</p>
            <p className="text-sm text-dark-muted mt-1">エピソードが公開されました</p>
          </div>
        ) : step === "uploading" ? (
          <div className="py-8">
            <div className="text-center mb-4">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-dark-muted">
                {progress < 70 ? "動画をアップロード中..." : "エピソードを作成中..."}
              </p>
            </div>
            <div className="w-full bg-dark-border rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs text-dark-muted mt-2">{progress}%</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ファイル選択 */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,.mp4,.mov"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="border border-dark-border rounded-lg p-3 flex items-center gap-3">
                  <svg className="w-8 h-8 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-text truncate">{file.name}</p>
                    <p className="text-xs text-dark-muted">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-dark-muted hover:text-red-400 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-dark-border rounded-lg p-8 text-center hover:border-accent/50 transition group"
                >
                  <svg className="w-10 h-10 mx-auto text-dark-muted group-hover:text-accent transition mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-dark-muted group-hover:text-dark-text transition">
                    クリックして動画を選択
                  </p>
                  <p className="text-xs text-dark-muted/60 mt-1">MP4, MOV / 最大500MB</p>
                </button>
              )}
            </div>

            {/* タイトル */}
            <div>
              <label className="block text-sm text-dark-muted mb-1">エピソードタイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
                className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-accent"
                placeholder="例: 第1話 出会い"
              />
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-sm text-dark-muted mb-1">説明（任意）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-accent resize-none"
                placeholder="エピソードの説明"
              />
            </div>

            {/* 視聴価格 */}
            <div>
              <label className="block text-sm text-dark-muted mb-1">視聴価格（コイン）</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={coinPrice}
                  onChange={(e) => setCoinPrice(Math.max(0, Math.min(10000, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={10000}
                  className="w-32 bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-accent"
                />
                <span className="text-xs text-dark-muted">0 = 無料公開 / 最大10,000</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[0, 50, 100, 200, 500].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCoinPrice(p)}
                    className={`px-2 py-1 rounded text-xs transition ${
                      coinPrice === p
                        ? "bg-accent/20 text-accent border border-accent"
                        : "bg-dark-card border border-dark-border text-dark-muted hover:border-accent/50"
                    }`}
                  >
                    {p === 0 ? "無料" : `${p}コイン`}
                  </button>
                ))}
              </div>
            </div>

            {/* 送信 */}
            <button
              type="submit"
              disabled={!file || !title || uploading}
              className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
            >
              アップロードして公開
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
