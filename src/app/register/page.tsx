"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // クリエイターフラグを設定
      if (isCreator) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ is_creator: true })
            .eq("id", user.id);
        }
      }
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-dark-card border border-dark-border rounded-xl p-8">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">認証メールを送信しました</h2>
            <p className="text-dark-muted mb-4">
              <span className="text-dark-text font-medium">{email}</span> 宛に<br />認証メールを送信しました。
            </p>
            <div className="bg-dark-bg border border-dark-border rounded-lg p-4 text-left space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">1.</span>
                <p className="text-dark-muted">メールボックスを確認してください</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">2.</span>
                <p className="text-dark-muted">メール内の<span className="text-dark-text">認証リンク</span>をクリックしてください</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">3.</span>
                <p className="text-dark-muted">自動的にホーム画面に移動します</p>
              </div>
            </div>
            <p className="text-xs text-dark-muted/60 mt-4">
              メールが届かない場合は、迷惑メールフォルダもご確認ください
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient">新規登録</h1>
          <p className="text-dark-muted mt-2">
            DramaAIで新しい物語体験を始めよう
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-muted mb-1">
              表示名
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
              placeholder="あなたの表示名"
            />
          </div>

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

          <label className="flex items-center gap-3 p-3 bg-dark-bg border border-dark-border rounded-lg cursor-pointer hover:border-accent/50 transition">
            <input
              type="checkbox"
              checked={isCreator}
              onChange={(e) => setIsCreator(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <div>
              <p className="text-sm font-medium">クリエイターとして登録</p>
              <p className="text-xs text-dark-muted">
                AI動画を生成してドラマを制作できます
              </p>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? "登録中..." : "アカウントを作成"}
          </button>

          <p className="text-center text-sm text-dark-muted">
            既にアカウントをお持ちですか？{" "}
            <Link href="/login" className="text-accent hover:underline">
              ログイン
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
