"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function WelcomeToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      setShow(true);
      // URLからwelcomeパラメータを削除
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      router.replace(url.pathname + url.search, { scroll: false });
      // 5秒後に自動非表示
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!show) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
      <div className="bg-green-500/20 border border-green-500/40 backdrop-blur-sm rounded-xl px-6 py-4 flex items-center gap-3 shadow-lg whitespace-nowrap">
        <div className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex flex-col">
          <p className="font-semibold text-green-300">登録が完了しました！</p>
          <p className="text-sm text-green-400/80">DramaAIへようこそ</p>
        </div>
        <button
          onClick={() => setShow(false)}
          className="ml-2 text-green-400/60 hover:text-green-300 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
