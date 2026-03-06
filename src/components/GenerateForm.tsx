"use client";

import { useState, useRef, useCallback } from "react";
import { GENERATE_COST } from "@/lib/types";

interface Props {
  dramaId: string;
  episodeNumber: number;
  coinBalance: number;
}

export function GenerateForm({ dramaId, episodeNumber, coinBalance }: Props) {
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState(`エピソード ${episodeNumber}`);
  const [duration, setDuration] = useState<5 | 10>(10);
  const [mode, setMode] = useState<"std" | "pro">("pro");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canGenerate = coinBalance >= GENERATE_COST;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  function startPolling(taskId: string, episodeId: string) {
    let attempts = 0;
    const maxAttempts = 90; // 最大15分（10秒間隔で長めの動画に対応）

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        stopPolling();
        setStatus("生成に時間がかかっています。しばらくしてから確認してください。");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/generate/status?task_id=${taskId}&episode_id=${episodeId}`
        );
        const data = await res.json();

        if (data.status === "succeed") {
          stopPolling();
          setStatus("✅ 動画の生成が完了しました！ページを更新して確認してください。");
          setLoading(false);
          setPrompt("");
        } else if (data.status === "failed") {
          stopPolling();
          setError(data.error || "動画の生成に失敗しました");
          setStatus(null);
          setLoading(false);
        } else {
          const elapsed = attempts * 10;
          const min = Math.floor(elapsed / 60);
          const sec = elapsed % 60;
          const timeStr = min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
          setStatus(`Kling AI (${mode === "pro" ? "Pro" : "Standard"}) が動画を生成中... (${timeStr}経過)`);
        }
      } catch {
        // ネットワークエラーは無視して次回リトライ
      }
    }, 10000);
  }

  async function handleGenerate() {
    if (!prompt.trim() || !canGenerate) return;

    setLoading(true);
    setError(null);
    setStatus("Kling AIに生成リクエストを送信中...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drama_id: dramaId,
          episode_number: episodeNumber,
          title,
          prompt: prompt.trim(),
          duration,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }

      if (data.task_id && data.episode?.id) {
        setStatus(`Kling AI (${mode === "pro" ? "Pro" : "Standard"}) が動画を生成中... (0秒経過)`);
        startPolling(data.task_id, data.episode.id);
      } else {
        setStatus("エピソードを作成しました（動画は後から確認してください）");
        setLoading(false);
        setPrompt("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStatus(null);
      setLoading(false);
    }
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">AI動画生成（Kling AI）</h3>

      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-dark-muted">生成コスト:</span>
        <span className="flex items-center gap-1 text-coin font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
          {GENERATE_COST}
        </span>
        {!canGenerate && (
          <span className="text-red-400 text-xs">（コインが不足しています）</span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-dark-muted mb-1">
            エピソードタイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
            placeholder="エピソードのタイトル"
            disabled={loading}
          />
        </div>

        {/* 動画設定 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-dark-muted mb-1">
              動画の長さ
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDuration(5)}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                  duration === 5
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-dark-bg border-dark-border text-dark-muted hover:border-dark-text"
                } disabled:opacity-50`}
              >
                5秒
              </button>
              <button
                type="button"
                onClick={() => setDuration(10)}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                  duration === 10
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-dark-bg border-dark-border text-dark-muted hover:border-dark-text"
                } disabled:opacity-50`}
              >
                10秒
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-muted mb-1">
              品質モード
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("std")}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                  mode === "std"
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-dark-bg border-dark-border text-dark-muted hover:border-dark-text"
                } disabled:opacity-50`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setMode("pro")}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                  mode === "pro"
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-dark-bg border-dark-border text-dark-muted hover:border-dark-text"
                } disabled:opacity-50`}
              >
                Pro（高精度）
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-dark-muted bg-dark-bg/50 rounded-lg px-3 py-2">
          💡 <strong>Pro</strong>モードはプロンプトの内容をより正確に反映します。
          <strong>10秒</strong>でより長いシーンを生成できます。
        </div>

        <div>
          <label className="block text-sm text-dark-muted mb-1">
            プロンプト（動画の内容を詳しく記述）
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition resize-none"
            placeholder={`動画の内容を具体的に記述してください。\n\n例: 夕暮れの東京の街を歩く若い男女。ネオンの光が雨に濡れた路面に反射している。二人は手をつなぎながら、にぎやかな商店街を歩いている。カメラはゆっくりと二人を追うように移動する。\n\n※ カメラワーク、照明、雰囲気なども記述すると精度が上がります。`}
            disabled={loading}
            maxLength={2500}
          />
          <p className="text-xs text-dark-muted mt-1 text-right">
            {prompt.length} / 2,500
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {status && !error && (
          <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent flex items-center gap-2">
            {loading && (
              <svg
                className="w-4 h-4 animate-spin flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {status}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate || !prompt.trim()}
          className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              生成中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI動画を生成（{GENERATE_COST} コイン）
            </>
          )}
        </button>
      </div>
    </div>
  );
}
