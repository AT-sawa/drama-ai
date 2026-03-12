"use client";

import { useState, useRef, useCallback } from "react";

interface Episode {
  id: string;
  episode_number: number;
  title: string;
  video_url: string | null;
}

interface VideoFrameCaptureProps {
  episodes: Episode[];
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function VideoFrameCapture({
  episodes,
  onCapture,
  onClose,
}: VideoFrameCaptureProps) {
  const videoEpisodes = episodes.filter((ep) => ep.video_url);
  const [selectedEpId, setSelectedEpId] = useState(
    videoEpisodes[0]?.id || ""
  );
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const selectedEp = videoEpisodes.find((ep) => ep.id === selectedEpId);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setCapturing(true);
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Canvas の取得に失敗しました");
        setCapturing(false);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCapture(blob);
          } else {
            setError("フレームのキャプチャに失敗しました");
          }
          setCapturing(false);
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      // CORS エラーの場合
      if (err instanceof DOMException && err.name === "SecurityError") {
        setError(
          "この動画はセキュリティ制限によりフレームキャプチャできません。画像アップロードをご利用ください。"
        );
      } else {
        setError("フレームのキャプチャに失敗しました");
      }
      setCapturing(false);
    }
  }, [onCapture]);

  if (videoEpisodes.length === 0) {
    return (
      <div className="text-center py-8 text-dark-muted">
        <p>動画のあるエピソードがありません</p>
        <button
          onClick={onClose}
          className="mt-4 text-accent hover:underline text-sm"
        >
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* エピソード選択 */}
      <div>
        <label className="block text-sm text-dark-muted mb-1">
          エピソードを選択
        </label>
        <select
          value={selectedEpId}
          onChange={(e) => {
            setSelectedEpId(e.target.value);
            setVideoLoaded(false);
            setError(null);
          }}
          className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-dark-text focus:outline-none focus:border-accent transition"
        >
          {videoEpisodes.map((ep) => (
            <option key={ep.id} value={ep.id}>
              EP.{ep.episode_number} - {ep.title}
            </option>
          ))}
        </select>
      </div>

      {/* 動画プレーヤー */}
      {selectedEp?.video_url && (
        <div className="rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={selectedEp.video_url}
            crossOrigin="anonymous"
            className="w-full"
            controls
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setError("動画の読み込みに失敗しました")}
          />
        </div>
      )}

      {/* 操作ボタン */}
      <div className="flex items-center justify-between text-sm text-dark-muted">
        <span>動画を再生し、使いたいシーンで一時停止してください</span>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={captureFrame}
          disabled={!videoLoaded || capturing}
          className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
        >
          {capturing ? (
            "キャプチャ中..."
          ) : (
            <>
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
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              このフレームをキャプチャ
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 border border-dark-border text-dark-muted hover:text-dark-text rounded-lg transition"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
