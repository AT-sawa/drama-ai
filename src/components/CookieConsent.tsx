"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // 少し遅延させてページ読み込み後に表示
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
    // GAを無効化
    if (typeof window !== "undefined") {
      (window as any)["ga-disable-" + process.env.NEXT_PUBLIC_GA_ID] = true;
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom">
      <div className="max-w-4xl mx-auto bg-dark-card border border-dark-border rounded-xl p-4 md:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-dark-text font-medium mb-1">Cookieの使用について</p>
          <p className="text-xs text-dark-muted leading-relaxed">
            当サイトでは、サービス向上のためにCookieを使用しています。
            「同意する」をクリックすると、アクセス解析等のCookie利用に同意いただけます。
            詳細は
            <Link href="/privacy" className="text-accent hover:underline mx-0.5">
              プライバシーポリシー
            </Link>
            をご確認ください。
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-xs border border-dark-border rounded-lg text-dark-muted hover:bg-dark-border/50 transition"
          >
            拒否
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition"
          >
            同意する
          </button>
        </div>
      </div>
    </div>
  );
}
