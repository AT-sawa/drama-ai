"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Episode } from "@/lib/types";

type SortKey = "episode" | "popular" | "newest";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "episode", label: "話数順" },
  { key: "popular", label: "人気順" },
  { key: "newest", label: "最新順" },
];

interface Props {
  episodes: Episode[];
  viewedEpisodeIds: Set<string>;
}

export function EpisodeList({ episodes, viewedEpisodeIds }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("episode");

  const sorted = useMemo(() => {
    const list = [...episodes];
    switch (sortKey) {
      case "popular":
        return list.sort((a, b) => b.view_count - a.view_count);
      case "newest":
        return list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "episode":
      default:
        return list.sort((a, b) => a.episode_number - b.episode_number);
    }
  }, [episodes, sortKey]);

  return (
    <div>
      {/* ソートボタン */}
      <div className="flex items-center gap-2 mb-4">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            className={`px-3 py-2 rounded-full text-xs font-medium transition ${
              sortKey === opt.key
                ? "bg-accent text-white"
                : "bg-dark-card border border-dark-border text-dark-muted hover:border-accent/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* エピソード一覧 */}
      <div className="space-y-3">
        {sorted.map((ep) => {
          const viewed = viewedEpisodeIds.has(ep.id);
          return (
            <Link
              key={ep.id}
              href={`/watch/${ep.id}`}
              className="flex gap-3 md:gap-4 p-3 bg-dark-card border border-dark-border rounded-lg hover:border-accent/50 transition group"
            >
              <div className="w-24 md:w-40 aspect-video relative flex-shrink-0 rounded-md overflow-hidden bg-dark-border">
                {ep.thumbnail_url ? (
                  <Image
                    src={ep.thumbnail_url}
                    alt={ep.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-dark-muted/40"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
                {viewed && (
                  <div className="absolute inset-0 bg-dark-bg/60 flex items-center justify-center">
                    <span className="text-xs bg-accent/80 text-white px-2 py-0.5 rounded">
                      視聴済み
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-dark-muted">
                    EP.{ep.episode_number}
                  </span>
                  {ep.is_free && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                      無料
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-dark-text group-hover:text-accent transition mt-1 line-clamp-1">
                  {ep.title}
                </h4>
                <p className="text-sm text-dark-muted mt-1 line-clamp-2">
                  {ep.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-dark-muted">
                  {ep.duration > 0 && (
                    <span>
                      {Math.floor(ep.duration / 60)}:
                      {String(ep.duration % 60).padStart(2, "0")}
                    </span>
                  )}
                  <span>{ep.view_count.toLocaleString()} 回視聴</span>
                  {!ep.is_free && ep.coin_price > 0 && !viewed && (
                    <span className="flex items-center gap-1 text-coin">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      {ep.coin_price}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
