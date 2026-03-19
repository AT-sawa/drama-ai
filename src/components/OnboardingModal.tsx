"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STEPS = [
  {
    icon: "🎬",
    title: "DramaAIへようこそ！",
    description:
      "AIが生成するオリジナルドラマを楽しめるサービスです。まずは基本的な使い方をご紹介します。",
  },
  {
    icon: "🔍",
    title: "作品を探す",
    description:
      "ホーム画面でジャンルやキーワードからお好みのドラマを検索できます。「あなたへのおすすめ」セクションでパーソナライズされた作品も表示されます。",
  },
  {
    icon: "🪙",
    title: "コインで視聴",
    description:
      "エピソードの視聴にはコインが必要です。コインページから購入できます。各エピソードの第1話は無料で視聴可能！",
  },
  {
    icon: "✨",
    title: "クリエイターになる",
    description:
      "あなたもAIを使ってオリジナルドラマを制作できます。プロンプトを入力するだけで、AIが動画を自動生成します。",
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding-completed");
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleComplete() {
    localStorage.setItem("onboarding-completed", "true");
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg border border-dark-border rounded-2xl max-w-md w-full overflow-hidden">
        {/* コンテンツ */}
        <div className="p-8 text-center">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="text-xl font-bold mb-3">{current.title}</h2>
          <p className="text-sm text-dark-muted leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* プログレスドット */}
        <div className="flex justify-center gap-2 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition ${
                i === step ? "bg-accent w-6" : "bg-dark-border hover:bg-dark-muted"
              }`}
            />
          ))}
        </div>

        {/* ボタン */}
        <div className="p-4 border-t border-dark-border flex justify-between items-center">
          <button
            onClick={handleComplete}
            className="text-xs text-dark-muted hover:text-dark-text transition"
          >
            スキップ
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm border border-dark-border rounded-lg hover:bg-dark-card transition"
              >
                戻る
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleComplete}
                className="px-6 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition"
              >
                はじめる
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition"
              >
                次へ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
