"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface PayoutRequest {
  id: string;
  amount: number;
  bank_name: string;
  branch_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  status: "pending" | "approved" | "completed" | "rejected";
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "申請中", color: "text-yellow-400 bg-yellow-400/10" },
  approved: { label: "承認済み", color: "text-blue-400 bg-blue-400/10" },
  completed: { label: "振込完了", color: "text-green-400 bg-green-400/10" },
  rejected: { label: "却下", color: "text-red-400 bg-red-400/10" },
};

export default function PayoutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // フォーム
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountType, setAccountType] = useState("普通");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/creator/payout");
      if (res.ok) {
        const data = await res.json();
        setTotalRevenue(data.totalRevenue);
        setTotalPaidOut(data.totalPaidOut);
        setAvailableBalance(data.availableBalance);
        setRequests(data.requests);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum < 1000) {
      setError("1,000コイン以上を入力してください");
      return;
    }
    if (amountNum > availableBalance) {
      setError("申請可能残高を超えています");
      return;
    }
    if (!bankName.trim() || !branchName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError("振込先情報をすべて入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/creator/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          bank_name: bankName.trim(),
          branch_name: branchName.trim(),
          account_type: accountType,
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "申請に失敗しました");
        return;
      }

      setSuccess("振込申請を受け付けました。処理完了までお待ちください。");
      setRequests((prev) => [data.request, ...prev]);
      setAvailableBalance((prev) => prev - amountNum);
      setTotalPaidOut((prev) => prev + amountNum);
      setAmount("");
    } catch {
      setError("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingRequest = requests.some((r) => r.status === "pending");

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <Link
          href="/creator"
          className="text-sm text-dark-muted hover:text-accent transition mb-3 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          クリエイターダッシュボード
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          収益の振込申請
        </h1>
      </div>

      {/* 収益サマリー */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 md:p-5 text-center">
          <p className="text-xs text-dark-muted mb-1">累計収益</p>
          <p className="text-lg md:text-2xl font-bold text-coin">
            {totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-dark-muted">コイン</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 md:p-5 text-center">
          <p className="text-xs text-dark-muted mb-1">申請済み</p>
          <p className="text-lg md:text-2xl font-bold text-dark-muted">
            {totalPaidOut.toLocaleString()}
          </p>
          <p className="text-xs text-dark-muted">コイン</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 md:p-5 text-center">
          <p className="text-xs text-dark-muted mb-1">申請可能</p>
          <p className="text-lg md:text-2xl font-bold text-green-400">
            {availableBalance.toLocaleString()}
          </p>
          <p className="text-xs text-dark-muted">コイン</p>
        </div>
      </div>

      {/* 振込レート説明 */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-8 text-sm text-dark-muted">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-dark-text mb-1">振込について</p>
            <ul className="space-y-1 text-xs">
              <li>・1コイン = 1円で換算されます</li>
              <li>・最低申請金額は <span className="text-accent font-semibold">1,000コイン（1,000円）</span> です</li>
              <li>・振込手数料は運営が負担します</li>
              <li>・申請から振込完了まで通常5〜10営業日です</li>
              <li>・処理中の申請がある場合、新規申請はできません</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 振込申請フォーム */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 md:p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">新規振込申請</h2>

        {hasPendingRequest ? (
          <div className="text-center py-6 text-dark-muted">
            <svg className="w-10 h-10 mx-auto mb-2 text-yellow-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">処理中の振込申請があります</p>
            <p className="text-xs text-dark-muted/60 mt-1">完了後に新規申請が可能になります</p>
          </div>
        ) : availableBalance < 1000 ? (
          <div className="text-center py-6 text-dark-muted">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">申請可能残高が1,000コインに満たないため、まだ申請できません</p>
            <p className="text-xs text-dark-muted/60 mt-1">
              現在の残高: {availableBalance.toLocaleString()} コイン
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 申請金額 */}
            <div>
              <label className="block text-sm font-medium mb-1">
                申請金額 <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1000}
                  max={availableBalance}
                  step={1}
                  placeholder="1000"
                  className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-dark-text focus:outline-none focus:border-accent transition"
                />
                <span className="text-sm text-dark-muted whitespace-nowrap">コイン</span>
                <button
                  type="button"
                  onClick={() => setAmount(String(availableBalance))}
                  className="text-xs text-accent hover:text-accent-hover transition whitespace-nowrap"
                >
                  全額
                </button>
              </div>
              <p className="text-xs text-dark-muted mt-1">
                申請可能: {availableBalance.toLocaleString()} コイン（= ¥{availableBalance.toLocaleString()}）
              </p>
            </div>

            {/* 振込先情報 */}
            <div className="border-t border-dark-border pt-4">
              <h3 className="text-sm font-semibold mb-3">振込先口座情報</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-dark-muted mb-1">
                    銀行名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="○○銀行"
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-accent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-muted mb-1">
                    支店名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="○○支店"
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-accent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-muted mb-1">
                    口座種別 <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-accent transition"
                  >
                    <option value="普通">普通</option>
                    <option value="当座">当座</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-dark-muted mb-1">
                    口座番号 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567"
                    maxLength={8}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-accent transition"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs text-dark-muted mb-1">
                  口座名義（カタカナ） <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="ヤマダ タロウ"
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
            >
              {submitting ? "申請中..." : "振込を申請する"}
            </button>
          </form>
        )}
      </div>

      {/* 申請履歴 */}
      <div>
        <h2 className="text-lg font-bold mb-4">申請履歴</h2>
        {requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((req) => {
              const st = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
              return (
                <div
                  key={req.id}
                  className="bg-dark-card border border-dark-border rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold">
                      ¥{req.amount.toLocaleString()}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="text-xs text-dark-muted space-y-0.5">
                    <p>{req.bank_name} {req.branch_name} {req.account_type} {req.account_number}</p>
                    <p>名義: {req.account_holder}</p>
                    <p>申請日: {new Date(req.created_at).toLocaleDateString("ja-JP")}</p>
                    {req.processed_at && (
                      <p>処理日: {new Date(req.processed_at).toLocaleDateString("ja-JP")}</p>
                    )}
                    {req.admin_note && (
                      <p className="text-yellow-400/80 mt-1">備考: {req.admin_note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-dark-muted">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>まだ振込申請はありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
