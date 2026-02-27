"use client";

import { useState } from "react";
import { GENERATE_COST } from "@/lib/types";

interface Props {
  dramaId: string;
  episodeNumber: number;
  coinBalance: number;
}

export function GenerateForm({ dramaId, episodeNumber, coinBalance }: Props) {
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState(`エピソード ${episodeNumber}`);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = coinBalance >= GENERATE_COST;

  async function handleGenerate() {
    if (!prompt.trim() || !canGenerate) return;

    setLoading(true);
    setError(null);
    setStatus("AI動画を生成中...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drama_id: dramaId,
          episode_number: episodeNumber,
          title,
          prompt: prompt.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }

      setStatus("生成が完了しました！");
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">AI動画生成</h3>

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

        <div>
          <label className="block text-sm text-dark-muted mb-1">
            プロンプト（動画の内容を記述）
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition resize-none"
            placeholder="例: 夕暮れの東京の街を歩く二人のシルエット。ネオンの光が雨に濡れた路面に反射している..."
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {status && !error && (
          <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent">
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
