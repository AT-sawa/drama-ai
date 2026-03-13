"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-red-400 mb-4">500</p>
        <h1 className="text-2xl font-bold mb-2">エラーが発生しました</h1>
        <p className="text-dark-muted mb-8">
          予期しないエラーが発生しました。しばらくしてからもう一度お試しください。
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            もう一度試す
          </button>
          <Link
            href="/"
            className="border border-dark-border hover:bg-dark-border/50 text-dark-text font-semibold px-6 py-3 rounded-lg transition"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
