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
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">登録完了</h2>
            <p className="text-dark-muted">
              確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 text-accent hover:underline"
            >
              ログインページへ
            </Link>
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
