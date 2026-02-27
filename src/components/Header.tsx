"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { CoinBalance } from "./CoinBalance";

export function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gradient">DramaAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-dark-muted hover:text-dark-text transition"
          >
            ホーム
          </Link>
          {profile?.is_creator && (
            <Link
              href="/creator"
              className="text-dark-muted hover:text-dark-text transition"
            >
              クリエイター
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {profile ? (
            <>
              <CoinBalance balance={profile.coin_balance} />
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm"
                >
                  {profile.display_name.charAt(0).toUpperCase()}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-lg shadow-xl py-1">
                    <div className="px-4 py-2 border-b border-dark-border">
                      <p className="text-sm font-medium truncate">
                        {profile.display_name}
                      </p>
                      <p className="text-xs text-dark-muted truncate">
                        {profile.email}
                      </p>
                    </div>
                    <Link
                      href="/coins"
                      className="block px-4 py-2 text-sm hover:bg-dark-border/50 transition"
                      onClick={() => setMenuOpen(false)}
                    >
                      コイン購入
                    </Link>
                    {profile.is_creator && (
                      <Link
                        href="/creator"
                        className="block px-4 py-2 text-sm hover:bg-dark-border/50 transition"
                        onClick={() => setMenuOpen(false)}
                      >
                        クリエイターダッシュボード
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
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-dark-muted hover:text-dark-text transition"
              >
                ログイン
              </Link>
              <Link
                href="/register"
                className="text-sm bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition"
              >
                新規登録
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
