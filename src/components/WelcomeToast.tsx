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
    <div className="fixed top-0 left-0 right-0 z-50 animate-in">
      <div className="bg-green-600 px-4 py-3 flex items-center justify-center gap-3">
        <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <div className="flex flex-col">
          <p className="font-semibold text-white text-sm">登録が完了しました！</p>
          <p className="text-xs text-green-100">DramaAIへようこそ</p>
        </div>
        <button
          onClick={() => setShow(false)}
          className="ml-2 text-green-200 hover:text-white transition flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
