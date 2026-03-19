import Link from "next/link";
import Image from "next/image";
import type { Drama } from "@/lib/types";
import { GENRE_LABELS } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

function truncateDescription(text: string, maxLength = 80): string {
  // 「冒頭：」「冒頭:」を削除
  let cleaned = text.replace(/^冒頭[：:][\s]*/,"");
  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength) + "...";
  }
  return cleaned;
}

export function DramaCard({ drama }: { drama: Drama }) {
  return (
    <div className="group bg-dark-card border border-dark-border rounded-xl overflow-hidden hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/5 h-full flex flex-col">
      <Link href={`/drama/${drama.id}`} className="block">
        <div className="aspect-video relative bg-dark-border overflow-hidden">
          {drama.thumbnail_url ? (
            <Image
              src={drama.thumbnail_url}
              alt={drama.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-orange-900/20">
              <svg
                className="w-12 h-12 text-accent/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-dark-bg/80 text-xs rounded-full text-accent">
              {GENRE_LABELS[drama.genre] || drama.genre}
            </span>
          </div>
        </div>
        <div className="p-4 pb-1 flex-1">
          <h3 className="font-bold text-dark-text group-hover:text-accent transition line-clamp-1">
            {drama.title}
          </h3>
          <p className="mt-1 text-sm text-dark-muted line-clamp-2">
            {truncateDescription(drama.description || "")}
          </p>
        </div>
      </Link>
      <div className="px-4 pb-3 mt-auto">
        {drama.creator && (
          <Link
            href={`/creator/${drama.creator.id}`}
            className="flex items-center gap-1.5 mb-1.5 w-fit"
          >
            <div className="w-5 h-5 rounded-full bg-accent/30 flex items-center justify-center text-[10px] font-bold text-accent">
              {drama.creator.display_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-dark-muted hover:text-accent transition">
              {drama.creator.display_name}
            </span>
          </Link>
        )}
        <div className="flex items-center justify-between text-xs text-dark-muted">
          <span>{formatNumber(drama.total_episodes)} エピソード</span>
          <div className="flex items-center gap-0.5">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {formatNumber(drama.likes_count || 0)}
            </span>
            <span>{formatNumber(drama.total_views)}回視聴</span>
          </div>
        </div>
      </div>
    </div>
  );
}
