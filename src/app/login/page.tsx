"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient">ログイン</h1>
          <p className="text-dark-muted mt-2">
            アカウントにログインして動画を楽しもう
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-muted mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-muted mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
              placeholder="6文字以上"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>

          <p className="text-center text-sm text-dark-muted">
            アカウントをお持ちでないですか？{" "}
            <Link href="/register" className="text-accent hover:underline">
              新規登録
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
