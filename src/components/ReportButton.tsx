"use client";

import { useState } from "react";

interface ReportButtonProps {
  targetType: "drama" | "episode" | "comment" | "user";
  targetId: string;
  isLoggedIn: boolean;
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: "不適切なコンテンツ",
  copyright: "著作権侵害",
  spam: "スパム・迷惑行為",
  harassment: "ハラスメント・嫌がらせ",
  misinformation: "虚偽情報",
  other: "その他",
};

export function ReportButton({ targetType, targetId, isLoggedIn }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
          detail,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: "通報を受け付けました。ご報告ありがとうございます。" });
      } else {
        setResult({ success: false, message: data.error || "送信に失敗しました" });
      }
    } catch {
      setResult({ success: false, message: "送信に失敗しました" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoggedIn) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-dark-muted/50 hover:text-red-400 transition text-xs flex items-center gap-1"
        title="通報する"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        通報
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => !submitting && setIsOpen(false)}>
          <div className="bg-dark-bg border border-dark-border rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {result ? (
              <div className="text-center py-4">
                <div className={`text-4xl mb-3 ${result.success ? "" : ""}`}>
                  {result.success ? "✅" : "❌"}
                </div>
                <p className={`text-sm ${result.success ? "text-green-400" : "text-red-400"}`}>
                  {result.message}
                </p>
                <button
                  onClick={() => { setIsOpen(false); setResult(null); setReason(""); setDetail(""); }}
                  className="mt-4 px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm hover:bg-dark-border/50 transition"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-bold mb-1">コンテンツを通報</h3>
                <p className="text-xs text-dark-muted mb-4">不適切なコンテンツの報告にご協力ください</p>

                <div className="space-y-3 mb-4">
                  {Object.entries(REASON_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="reason"
                        value={key}
                        checked={reason === key}
                        onChange={() => setReason(key)}
                        className="w-4 h-4 accent-accent"
                      />
                      <span className="text-sm text-dark-muted group-hover:text-dark-text transition">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="詳細（任意・500文字以内）"
                  maxLength={500}
                  rows={3}
                  className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-accent resize-none mb-4"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm hover:bg-dark-border/50 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={!reason || submitting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white font-medium transition"
                  >
                    {submitting ? "送信中..." : "通報する"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
