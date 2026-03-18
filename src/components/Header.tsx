"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { CoinBalance } from "./CoinBalance";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function closeAll() {
    setMenuOpen(false);
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={closeAll}>
          <span className="text-xl md:text-2xl font-bold text-gradient">DramaAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-dark-muted hover:text-dark-text transition"
          >
            ホーム
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          {profile ? (
            <>
              <CoinBalance balance={profile.coin_balance} />
              <NotificationBell />
              {/* デスクトップ: アバターメニュー */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm"
                >
                  {profile.display_name.charAt(0).toUpperCase()}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-dark-card border border-dark-border rounded-lg shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-dark-border">
                      <p className="text-sm font-medium truncate">
                        {profile.display_name}
                      </p>
                      <p className="text-xs text-dark-muted truncate">
                        {profile.email}
                      </p>
                    </div>
                    <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                      プロフィール編集
                    </Link>
                    <Link href="/favorites" className="block px-4 py-2 text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                      ❤️ お気に入り一覧
                    </Link>
                    <Link href="/history" className="block px-4 py-2 text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                      🕐 視聴履歴
                    </Link>
                    <Link href="/coins" className="block px-4 py-2 text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                      コイン購入
                    </Link>
                    {profile.is_creator && (
                      <Link href="/creator" className="block px-4 py-2 text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                        クリエイターダッシュボード
                      </Link>
                    )}
                    {profile.is_admin && (
                      <Link href="/admin" className="block px-4 py-2 text-sm text-red-400 hover:bg-dark-border/50 transition" onClick={closeAll}>
                        🛡️ 管理者ダッシュボード
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-dark-border/50 transition"
                    >
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
              {/* モバイル: ハンバーガーメニュー */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-border/50 transition"
                aria-label="メニュー"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className="text-sm text-dark-muted hover:text-dark-text transition">
                  ログイン
                </Link>
                <Link href="/register" className="text-sm bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition">
                  新規登録
                </Link>
              </div>
              {/* モバイル: 未ログイン時のハンバーガー */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-border/50 transition"
                aria-label="メニュー"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* モバイルメニュー */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-dark-border bg-dark-bg/95 backdrop-blur-md">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            <Link href="/" className="block px-3 py-3 rounded-lg text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
              🏠 ホーム
            </Link>
            {profile ? (
              <>
                <div className="px-3 py-2 border-b border-dark-border mb-1">
                  <p className="text-sm font-medium truncate">{profile.display_name}</p>
                  <p className="text-xs text-dark-muted truncate">{profile.email}</p>
                </div>
                <Link href="/profile" className="block px-3 py-3 rounded-lg text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                  👤 プロフィール編集
                </Link>
                <Link href="/favorites" className="block px-3 py-3 rounded-lg text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                  ❤️ お気に入り一覧
                </Link>
                <Link href="/history" className="block px-3 py-3 rounded-lg text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                  🕐 視聴履歴
                </Link>
                <Link href="/coins" className="block px-3 py-3 rounded-lg text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                  🪙 コイン購入
                </Link>
                {profile.is_creator && (
                  <Link href="/creator" className="block px-3 py-3 rounded-lg text-sm hover:bg-dark-border/50 transition" onClick={closeAll}>
                    🎬 クリエイターダッシュボード
                  </Link>
                )}
                {profile.is_admin && (
                  <Link href="/admin" className="block px-3 py-3 rounded-lg text-sm text-red-400 hover:bg-dark-border/50 transition" onClick={closeAll}>
                    🛡️ 管理者ダッシュボード
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-3 rounded-lg text-sm text-red-400 hover:bg-dark-border/50 transition"
                >
                  🚪 ログアウト
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login" className="block text-center px-4 py-3 rounded-lg text-sm border border-dark-border hover:bg-dark-border/50 transition" onClick={closeAll}>
                  ログイン
                </Link>
                <Link href="/register" className="block text-center px-4 py-3 rounded-lg text-sm bg-accent hover:bg-accent-hover text-white transition" onClick={closeAll}>
                  新規登録
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
