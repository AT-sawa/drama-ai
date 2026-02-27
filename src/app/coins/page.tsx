"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COIN_PACKAGES } from "@/lib/types";
import type { Profile, Transaction } from "@/lib/types";

export default function CoinsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      const { data: txns } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (txns) setTransactions(txns);

      setLoading(false);
    }
    load();
  }, []);

  async function handlePurchase(packageId: string) {
    setPurchasing(packageId);

    try {
      const res = await fetch("/api/coins/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "購入に失敗しました");
      }

      // Stripe Checkout に遷移
      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
      setPurchasing(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    purchase: "コイン購入",
    view: "エピソード視聴",
    generate: "AI動画生成",
    revenue: "クリエイター収益",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 残高表示 */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center mb-8">
        <p className="text-dark-muted text-sm mb-1">現在のコイン残高</p>
        <div className="flex items-center justify-center gap-2">
          <svg
            className="w-8 h-8 text-coin"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="12" cy="12" r="10" opacity="0.2" />
            <circle cx="12" cy="12" r="8" />
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fontSize="10"
              fill="#0f1419"
              fontWeight="bold"
            >
              C
            </text>
          </svg>
          <span className="text-4xl font-bold text-coin">
            {profile?.coin_balance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* コインパッケージ */}
      <h2 className="text-xl font-bold mb-4">コインを購入</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {COIN_PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => handlePurchase(pkg.id)}
            disabled={purchasing !== null}
            className={`relative bg-dark-card border border-dark-border rounded-xl p-6 text-center hover:border-coin/50 transition group ${
              purchasing === pkg.id ? "opacity-50" : ""
            }`}
          >
            {pkg.bonus && (
              <div className="absolute -top-2 -right-2 bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                {pkg.bonus}
              </div>
            )}
            <div className="flex items-center justify-center gap-1 mb-2">
              <svg
                className="w-6 h-6 text-coin"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="text-2xl font-bold text-coin">{pkg.label}</span>
            </div>
            <div className="text-3xl font-bold my-3">
              &yen;{pkg.price.toLocaleString()}
            </div>
            <div className="text-sm text-dark-muted">
              {pkg.coins === pkg.price
                ? "1コイン = 1円"
                : `1コイン ≈ ${(pkg.price / pkg.coins).toFixed(2)}円`}
            </div>
            <div className="mt-4 bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 rounded-lg transition group-hover:shadow-lg group-hover:shadow-accent/20">
              {purchasing === pkg.id ? "処理中..." : "購入する"}
            </div>
          </button>
        ))}
      </div>

      {/* 取引履歴 */}
      <h2 className="text-xl font-bold mb-4">取引履歴</h2>
      {transactions.length > 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border text-sm text-dark-muted">
                <th className="text-left px-4 py-3 font-medium">日時</th>
                <th className="text-left px-4 py-3 font-medium">種別</th>
                <th className="text-left px-4 py-3 font-medium">内容</th>
                <th className="text-right px-4 py-3 font-medium">コイン</th>
                <th className="text-right px-4 py-3 font-medium">残高</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-dark-border/50 last:border-0"
                >
                  <td className="px-4 py-3 text-sm text-dark-muted">
                    {new Date(tx.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {typeLabels[tx.type] || tx.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-muted">
                    {tx.description}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-semibold ${
                      tx.amount >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-coin">
                    {tx.balance_after}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-dark-muted">
          <p>取引履歴はまだありません</p>
        </div>
      )}
    </div>
  );
}
