"use client";

import { useEffect, useState } from "react";
import { DramaCard } from "./DramaCard";
import { GENRE_LABELS } from "@/lib/types";
import type { Drama } from "@/lib/types";

export function RecommendSection() {
  const [recommendations, setRecommendations] = useState<Drama[]>([]);
  const [reason, setReason] = useState<"personalized" | "popular">("popular");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch("/api/recommendations");
        if (!res.ok) return;
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setReason(data.reason || "popular");
        setFavoriteGenres(data.favoriteGenres || []);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-7 w-48 bg-dark-card rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-dark-card rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-dark-border/50" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-dark-border/50 rounded w-3/4" />
                <div className="h-4 bg-dark-border/50 rounded w-full" />
                <div className="h-4 bg-dark-border/50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) return null;

  const genreLabel = favoriteGenres
    .slice(0, 2)
    .map((g) => GENRE_LABELS[g as keyof typeof GENRE_LABELS] || g)
    .join("・");

  return (
    <section className="mb-12">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">✨</span>
        <div>
          <h2 className="text-xl md:text-2xl font-bold">
            {reason === "personalized"
              ? "あなたへのおすすめ"
              : "人気のドラマ"}
          </h2>
          {reason === "personalized" && genreLabel && (
            <p className="text-sm text-dark-muted mt-0.5">
              {genreLabel}の視聴傾向に基づくおすすめ
            </p>
          )}
          {reason === "popular" && (
            <p className="text-sm text-dark-muted mt-0.5">
              視聴数の多い注目作品
            </p>
          )}
        </div>
      </div>

      {/* 横スクロールカルーセル */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {recommendations.map((drama) => (
            <div
              key={drama.id}
              className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start"
            >
              <DramaCard drama={drama} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
