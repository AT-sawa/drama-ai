import Link from "next/link";
import Image from "next/image";
import type { Drama } from "@/lib/types";
import { GENRE_LABELS } from "@/lib/types";

export function DramaCard({ drama }: { drama: Drama }) {
  return (
    <Link
      href={`/drama/${drama.id}`}
      className="group block bg-dark-card border border-dark-border rounded-xl overflow-hidden hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/5"
    >
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
      <div className="p-4">
        <h3 className="font-bold text-dark-text group-hover:text-accent transition line-clamp-1">
          {drama.title}
        </h3>
        <p className="mt-1 text-sm text-dark-muted line-clamp-2">
          {drama.description}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-dark-muted">
          <span>{drama.total_episodes} エピソード</span>
          <span>{drama.total_views.toLocaleString()} 回視聴</span>
        </div>
      </div>
    </Link>
  );
}
