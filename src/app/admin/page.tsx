"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

type Tab = "overview" | "users" | "dramas" | "payouts";

interface AdminStats {
  totalUsers: number;
  totalDramas: number;
  totalEpisodes: number;
  totalViews: number;
  totalRevenue: number;
  pendingPayouts: number;
  recentUsers: any[];
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  coin_balance: number;
  is_creator: boolean;
  is_admin: boolean;
  created_at: string;
}

interface DramaRow {
  id: string;
  title: string;
  genre: string;
  total_episodes: number;
  total_views: number;
  likes_count: number;
  is_published: boolean;
  created_at: string;
  creator?: { id: string; display_name: string; email: string };
}

interface PayoutRow {
  id: string;
  amount: number;
  bank_name: string;
  branch_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  user?: { id: string; display_name: string; email: string };
}

const GENRE_LABELS: Record<string, string> = {
  drama: "ドラマ", romance: "恋愛", action: "アクション", comedy: "コメディ",
  thriller: "スリラー", "sci-fi": "SF", horror: "ホラー", fantasy: "ファンタジー",
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Overview
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");

  // Dramas
  const [dramas, setDramas] = useState<DramaRow[]>([]);
  const [dramasTotal, setDramasTotal] = useState(0);
  const [dramasPage, setDramasPage] = useState(1);
  const [dramaSearch, setDramaSearch] = useState("");
  const [dramaFilter, setDramaFilter] = useState<string>("all");

  // Payouts
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [payoutFilter, setPayoutFilter] = useState("pending");
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "overview") fetchStats();
    if (tab === "users") fetchUsers();
    if (tab === "dramas") fetchDramas();
    if (tab === "payouts") fetchPayouts();
  }, [tab, isAdmin, usersPage, userSearch, dramasPage, dramaSearch, dramaFilter, payoutFilter]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      router.push("/");
      return;
    }
    setIsAdmin(true);
    setLoading(false);
  }

  async function fetchStats() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  }

  async function fetchUsers() {
    const params = new URLSearchParams({ page: String(usersPage) });
    if (userSearch) params.set("q", userSearch);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setUsersTotal(data.total);
    }
  }

  async function fetchDramas() {
    const params = new URLSearchParams({ page: String(dramasPage) });
    if (dramaSearch) params.set("q", dramaSearch);
    if (dramaFilter !== "all") params.set("published", dramaFilter);
    const res = await fetch(`/api/admin/dramas?${params}`);
    if (res.ok) {
      const data = await res.json();
      setDramas(data.dramas);
      setDramasTotal(data.total);
    }
  }

  async function fetchPayouts() {
    const res = await fetch(`/api/admin/payouts?status=${payoutFilter}`);
    if (res.ok) {
      const data = await res.json();
      setPayouts(data.payouts);
    }
  }

  async function updateUser(userId: string, updates: Record<string, any>) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, updates }),
    });
    if (res.ok) fetchUsers();
  }

  async function toggleDramaPublish(dramaId: string, currentState: boolean) {
    const res = await fetch("/api/admin/dramas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dramaId, updates: { is_published: !currentState } }),
    });
    if (res.ok) fetchDramas();
  }

  async function deleteDrama(dramaId: string, title: string) {
    if (!confirm(`「${title}」を完全に削除しますか？この操作は取り消せません。`)) return;
    const res = await fetch(`/api/admin/dramas?id=${dramaId}`, { method: "DELETE" });
    if (res.ok) fetchDramas();
  }

  async function updatePayoutStatus(payoutId: string, status: string) {
    const res = await fetch("/api/admin/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId, status, adminNote: adminNote || undefined }),
    });
    if (res.ok) {
      setProcessingPayout(null);
      setAdminNote("");
      fetchPayouts();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "概要", icon: "📊" },
    { id: "users", label: "ユーザー管理", icon: "👥" },
    { id: "dramas", label: "コンテンツ管理", icon: "🎬" },
    { id: "payouts", label: "振込管理", icon: "💰" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">🛡️</span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">管理者ダッシュボード</h1>
          <p className="text-dark-muted text-sm">サービス全体の管理・監視</p>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              tab === t.id
                ? "bg-accent text-white"
                : "bg-dark-card border border-dark-border text-dark-muted hover:border-accent/50"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {tab === "overview" && (
        <div className="space-y-8">
          {/* 統計カード */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "ユーザー数", value: stats?.totalUsers || 0, icon: "👥", color: "text-blue-400" },
              { label: "ドラマ数", value: stats?.totalDramas || 0, icon: "🎬", color: "text-purple-400" },
              { label: "エピソード数", value: stats?.totalEpisodes || 0, icon: "📺", color: "text-green-400" },
              { label: "総視聴数", value: stats?.totalViews || 0, icon: "👁️", color: "text-yellow-400" },
              { label: "総売上(コイン)", value: stats?.totalRevenue || 0, icon: "💰", color: "text-coin" },
              { label: "未処理振込", value: stats?.pendingPayouts || 0, icon: "📋", color: "text-red-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-dark-card border border-dark-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span>{stat.icon}</span>
                  <span className="text-xs text-dark-muted">{stat.label}</span>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {formatNumber(stat.value)}
                </p>
              </div>
            ))}
          </div>

          {/* 最近のユーザー */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">最近の登録ユーザー</h3>
            <div className="space-y-3">
              {(stats?.recentUsers || []).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-dark-border/50 last:border-0">
                  <div>
                    <p className="font-medium">{u.display_name}</p>
                    <p className="text-sm text-dark-muted">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.is_creator && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">クリエイター</span>
                    )}
                    <span className="text-xs text-dark-muted">
                      {new Date(u.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* クイックリンク */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(stats?.pendingPayouts || 0) > 0 && (
              <button
                onClick={() => setTab("payouts")}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-left hover:border-red-500/60 transition"
              >
                <p className="text-red-400 font-bold text-lg">{stats?.pendingPayouts}件</p>
                <p className="text-sm text-dark-muted">未処理の振込申請があります</p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ユーザー管理タブ */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* 検索 */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="メールアドレスまたは表示名で検索..."
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
              className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
            <span className="text-sm text-dark-muted self-center">{formatNumber(usersTotal)}件</span>
          </div>

          {/* ユーザーテーブル */}
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-bg/50">
                    <th className="text-left px-4 py-3 font-medium text-dark-muted">ユーザー</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-muted">メール</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">コイン</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">クリエイター</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">管理者</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-dark-border/50 hover:bg-dark-border/10">
                      <td className="px-4 py-3 font-medium">{u.display_name}</td>
                      <td className="px-4 py-3 text-dark-muted">{u.email}</td>
                      <td className="px-4 py-3 text-center text-coin">{formatNumber(u.coin_balance)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => updateUser(u.id, { is_creator: !u.is_creator })}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                            u.is_creator
                              ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                              : "bg-dark-border/50 text-dark-muted hover:bg-dark-border"
                          }`}
                        >
                          {u.is_creator ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => updateUser(u.id, { is_admin: !u.is_admin })}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                            u.is_admin
                              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              : "bg-dark-border/50 text-dark-muted hover:bg-dark-border"
                          }`}
                        >
                          {u.is_admin ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-dark-muted text-xs">
                        {new Date(u.created_at).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ページネーション */}
          {usersTotal > 20 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                disabled={usersPage === 1}
                className="px-3 py-1.5 rounded bg-dark-card border border-dark-border text-sm disabled:opacity-50"
              >
                前へ
              </button>
              <span className="px-3 py-1.5 text-sm text-dark-muted">
                {usersPage} / {Math.ceil(usersTotal / 20)}
              </span>
              <button
                onClick={() => setUsersPage((p) => p + 1)}
                disabled={usersPage >= Math.ceil(usersTotal / 20)}
                className="px-3 py-1.5 rounded bg-dark-card border border-dark-border text-sm disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          )}
        </div>
      )}

      {/* コンテンツ管理タブ */}
      {tab === "dramas" && (
        <div className="space-y-4">
          {/* フィルター */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="タイトルで検索..."
              value={dramaSearch}
              onChange={(e) => { setDramaSearch(e.target.value); setDramasPage(1); }}
              className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              {[
                { value: "all", label: "すべて" },
                { value: "true", label: "公開中" },
                { value: "false", label: "非公開" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setDramaFilter(f.value); setDramasPage(1); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                    dramaFilter === f.value
                      ? "bg-accent text-white"
                      : "bg-dark-card border border-dark-border text-dark-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-dark-muted self-center">{formatNumber(dramasTotal)}件</span>
          </div>

          {/* ドラマテーブル */}
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-bg/50">
                    <th className="text-left px-4 py-3 font-medium text-dark-muted">タイトル</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-muted">クリエイター</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">ジャンル</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">話数</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">視聴</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">状態</th>
                    <th className="text-center px-4 py-3 font-medium text-dark-muted">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dramas.map((d) => (
                    <tr key={d.id} className="border-b border-dark-border/50 hover:bg-dark-border/10">
                      <td className="px-4 py-3">
                        <Link href={`/drama/${d.id}`} className="font-medium hover:text-accent transition">
                          {d.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-dark-muted text-xs">
                        {d.creator?.display_name || "不明"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                          {GENRE_LABELS[d.genre] || d.genre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-dark-muted">{d.total_episodes}</td>
                      <td className="px-4 py-3 text-center text-dark-muted">{formatNumber(d.total_views)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          d.is_published
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {d.is_published ? "公開" : "非公開"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleDramaPublish(d.id, d.is_published)}
                            className="text-xs px-2 py-1 rounded bg-dark-border/50 hover:bg-dark-border transition"
                            title={d.is_published ? "非公開にする" : "公開する"}
                          >
                            {d.is_published ? "非公開" : "公開"}
                          </button>
                          <button
                            onClick={() => deleteDrama(d.id, d.title)}
                            className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ページネーション */}
          {dramasTotal > 20 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setDramasPage((p) => Math.max(1, p - 1))}
                disabled={dramasPage === 1}
                className="px-3 py-1.5 rounded bg-dark-card border border-dark-border text-sm disabled:opacity-50"
              >
                前へ
              </button>
              <span className="px-3 py-1.5 text-sm text-dark-muted">
                {dramasPage} / {Math.ceil(dramasTotal / 20)}
              </span>
              <button
                onClick={() => setDramasPage((p) => p + 1)}
                disabled={dramasPage >= Math.ceil(dramasTotal / 20)}
                className="px-3 py-1.5 rounded bg-dark-card border border-dark-border text-sm disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          )}
        </div>
      )}

      {/* 振込管理タブ */}
      {tab === "payouts" && (
        <div className="space-y-4">
          {/* フィルター */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { value: "pending", label: "未処理", count: true },
              { value: "approved", label: "承認済み" },
              { value: "completed", label: "振込完了" },
              { value: "rejected", label: "却下" },
              { value: "all", label: "すべて" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setPayoutFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  payoutFilter === f.value
                    ? "bg-accent text-white"
                    : "bg-dark-card border border-dark-border text-dark-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 振込申請リスト */}
          <div className="space-y-4">
            {payouts.length === 0 && (
              <div className="text-center py-12 text-dark-muted">
                <p>該当する振込申請はありません</p>
              </div>
            )}

            {payouts.map((p) => (
              <div key={p.id} className="bg-dark-card border border-dark-border rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* 申請情報 */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-coin">{formatNumber(p.amount)} コイン</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        p.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                        p.status === "completed" ? "bg-green-500/20 text-green-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {p.status === "pending" ? "未処理" :
                         p.status === "approved" ? "承認済み" :
                         p.status === "completed" ? "振込完了" : "却下"}
                      </span>
                    </div>

                    <div className="text-sm text-dark-muted">
                      <span className="font-medium text-dark-text">{p.user?.display_name}</span>
                      <span className="mx-2">|</span>
                      <span>{p.user?.email}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-dark-muted bg-dark-bg/50 rounded-lg p-3">
                      <div>
                        <span className="block text-dark-muted/60">銀行名</span>
                        <span>{p.bank_name}</span>
                      </div>
                      <div>
                        <span className="block text-dark-muted/60">支店名</span>
                        <span>{p.branch_name}</span>
                      </div>
                      <div>
                        <span className="block text-dark-muted/60">口座種別</span>
                        <span>{p.account_type}</span>
                      </div>
                      <div>
                        <span className="block text-dark-muted/60">口座番号</span>
                        <span>{p.account_number}</span>
                      </div>
                      <div>
                        <span className="block text-dark-muted/60">名義</span>
                        <span>{p.account_holder}</span>
                      </div>
                      <div>
                        <span className="block text-dark-muted/60">申請日</span>
                        <span>{new Date(p.created_at).toLocaleDateString("ja-JP")}</span>
                      </div>
                    </div>

                    {p.admin_note && (
                      <div className="text-xs bg-yellow-500/10 text-yellow-400/80 rounded p-2">
                        管理者メモ: {p.admin_note}
                      </div>
                    )}
                  </div>

                  {/* アクション */}
                  {p.status === "pending" && (
                    <div className="flex flex-col gap-2 min-w-[160px]">
                      {processingPayout === p.id ? (
                        <div className="space-y-2">
                          <textarea
                            placeholder="管理者メモ（任意）"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs resize-none h-16 focus:outline-none focus:border-accent"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updatePayoutStatus(p.id, "approved")}
                              className="flex-1 bg-blue-500 text-white text-xs py-1.5 rounded-lg hover:bg-blue-600 transition"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => updatePayoutStatus(p.id, "rejected")}
                              className="flex-1 bg-red-500 text-white text-xs py-1.5 rounded-lg hover:bg-red-600 transition"
                            >
                              却下
                            </button>
                          </div>
                          <button
                            onClick={() => { setProcessingPayout(null); setAdminNote(""); }}
                            className="text-xs text-dark-muted hover:text-dark-text transition"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setProcessingPayout(p.id)}
                          className="bg-accent text-white text-sm py-2 px-4 rounded-lg hover:bg-accent/80 transition"
                        >
                          処理する
                        </button>
                      )}
                    </div>
                  )}
                  {p.status === "approved" && (
                    <button
                      onClick={() => updatePayoutStatus(p.id, "completed")}
                      className="bg-green-500 text-white text-sm py-2 px-4 rounded-lg hover:bg-green-600 transition"
                    >
                      振込完了
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
