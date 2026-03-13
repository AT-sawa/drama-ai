"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nameMsg, setNameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name);
        setEmail(data.email);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);

    if (error) {
      setNameMsg({ type: "error", text: error.message });
    } else {
      setNameMsg({ type: "success", text: "表示名を更新しました" });
    }
    setSavingName(false);
  }

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setEmailMsg(null);

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setEmailMsg({ type: "error", text: error.message });
    } else {
      setEmailMsg({ type: "success", text: "確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。" });
    }
    setSavingEmail(false);
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "パスワードが一致しません" });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: "error", text: "パスワードは6文字以上で入力してください" });
      return;
    }

    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPassMsg({ type: "error", text: error.message });
    } else {
      setPassMsg({ type: "success", text: "パスワードを更新しました" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPass(false);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteMsg(null);

    const res = await fetch("/api/account/delete", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setDeleteMsg({ type: "error", text: data.error || "削除に失敗しました" });
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gradient">プロフィール編集</h1>

        {/* 表示名 */}
        <form onSubmit={handleNameSave} className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">表示名</h2>
          {nameMsg && (
            <div className={`p-3 rounded-lg text-sm ${nameMsg.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
              {nameMsg.text}
            </div>
          )}
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
          />
          <button
            type="submit"
            disabled={savingName}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {savingName ? "保存中..." : "表示名を変更"}
          </button>
        </form>

        {/* メールアドレス */}
        <form onSubmit={handleEmailSave} className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">メールアドレス</h2>
          {emailMsg && (
            <div className={`p-3 rounded-lg text-sm ${emailMsg.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
              {emailMsg.text}
            </div>
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
          />
          <p className="text-xs text-dark-muted">変更後、新しいメールアドレスに確認メールが送信されます</p>
          <button
            type="submit"
            disabled={savingEmail}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {savingEmail ? "送信中..." : "メールアドレスを変更"}
          </button>
        </form>

        {/* パスワード */}
        <form onSubmit={handlePasswordSave} className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">パスワード変更</h2>
          {passMsg && (
            <div className={`p-3 rounded-lg text-sm ${passMsg.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
              {passMsg.text}
            </div>
          )}
          <div>
            <label className="block text-sm text-dark-muted mb-1">新しいパスワード</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
              placeholder="6文字以上"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-muted mb-1">パスワード確認</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent transition"
              placeholder="もう一度入力"
            />
          </div>
          <button
            type="submit"
            disabled={savingPass || !newPassword}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {savingPass ? "更新中..." : "パスワードを変更"}
          </button>
        </form>

        {/* アカウント削除 */}
        <div className="bg-dark-card border border-red-500/30 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-red-400">退会（アカウント削除）</h2>
          <p className="text-dark-muted text-sm">
            アカウントを削除すると、すべてのデータ（プロフィール、作品、購入履歴など）が完全に削除されます。この操作は取り消せません。
          </p>
          {deleteMsg && (
            <div className="p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400">
              {deleteMsg.text}
            </div>
          )}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="border border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold px-6 py-2.5 rounded-lg transition"
            >
              アカウントを削除する
            </button>
          ) : (
            <div className="space-y-3 bg-dark-bg border border-dark-border rounded-lg p-4">
              <p className="text-sm text-red-400 font-medium">
                本当に削除しますか？確認のため「削除」と入力してください。
              </p>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="削除"
                className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-red-500 transition"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteText !== "削除" || deleting}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition"
                >
                  {deleting ? "削除中..." : "完全に削除する"}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                  className="border border-dark-border hover:bg-dark-border/50 text-dark-text px-6 py-2.5 rounded-lg transition"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
