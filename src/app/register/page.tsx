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

          {/* 区切り線 */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-dark-card px-3 text-dark-muted">または</span>
            </div>
          </div>

          {/* Googleで登録 */}
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/api/auth/callback`,
                },
              });
            }}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-lg transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Googleで登録
          </button>

          <p className="text-center text-xs text-dark-muted/70">
            アカウントを作成することで、
            <Link href="/terms" className="text-accent hover:underline">
              利用規約
            </Link>
            および
            <Link href="/privacy" className="text-accent hover:underline">
              プライバシーポリシー
            </Link>
            に同意したものとみなします。
          </p>

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
