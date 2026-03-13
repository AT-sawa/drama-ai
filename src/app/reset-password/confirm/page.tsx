"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordConfirmPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // まず既存セッションを確認
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setChecking(false);
        return;
      }

      // セッションがまだない場合は少し待ってリトライ
      // （コールバックからのリダイレクト直後はCookieの反映にラグがある場合がある）
      setTimeout(async () => {
        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession();
        if (retrySession) {
          setIsAuthenticated(true);
        }
        setChecking(false);
      }, 1000);
    }

    // onAuthStateChange でリアルタイムにセッション変更を検知
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setIsAuthenticated(true);
        setChecking(false);
      }
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError("パスワードの更新に失敗しました。もう一度お試しください。");
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-dark-card border border-dark-border rounded-xl p-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">
              リンクが無効です
            </h2>
            <p className="text-dark-muted mb-6">
              パスワードリセットリンクが無効または期限切れです。
              もう一度リセットメールを送信してください。
            </p>
            <Link
              href="/reset-password"
              className="inline-block bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-2.5 rounded-lg transition"
            >
              リセットメールを再送信
            </Link>
          </div>
        </div>
      </div>
    );
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
            <h2 className="text-xl font-bold mb-2">
              パスワードを変更しました
            </h2>
            <p className="text-dark-muted mb-6">
              新しいパスワードでログインできます。
            </p>
            <button
              onClick={() => router.push("/")}
              className="inline-block bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-2.5 rounded-lg transition"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient">
            新しいパスワード
          </h1>
          <p className="text-dark-muted mt-2">
            新しいパスワードを入力してください
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-muted mb-1">
              新しいパスワード
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

          <div>
            <label className="block text-sm text-dark-muted mb-1">
              パスワード確認
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
              placeholder="もう一度入力"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? "更新中..." : "パスワードを変更"}
          </button>
        </form>
      </div>
    </div>
  );
}
