import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildUrl: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, buildUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  // 表示するページ番号を計算（最大5つ）
  const pages: number[] = [];
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="ページネーション">
      {/* 前へ */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="flex items-center gap-1 px-3 py-2 text-sm text-dark-muted hover:text-dark-text bg-dark-card border border-dark-border rounded-lg hover:border-accent/50 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">前へ</span>
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-3 py-2 text-sm text-dark-muted/30 bg-dark-card/50 border border-dark-border/50 rounded-lg cursor-not-allowed">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">前へ</span>
        </span>
      )}

      {/* 最初のページ + 省略 */}
      {start > 1 && (
        <>
          <Link
            href={buildUrl(1)}
            className="w-9 h-9 flex items-center justify-center text-sm text-dark-muted hover:text-dark-text bg-dark-card border border-dark-border rounded-lg hover:border-accent/50 transition"
          >
            1
          </Link>
          {start > 2 && (
            <span className="w-9 h-9 flex items-center justify-center text-dark-muted/50 text-sm">…</span>
          )}
        </>
      )}

      {/* ページ番号 */}
      {pages.map((page) =>
        page === currentPage ? (
          <span
            key={page}
            className="w-9 h-9 flex items-center justify-center text-sm font-bold text-white bg-accent rounded-lg"
          >
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={buildUrl(page)}
            className="w-9 h-9 flex items-center justify-center text-sm text-dark-muted hover:text-dark-text bg-dark-card border border-dark-border rounded-lg hover:border-accent/50 transition"
          >
            {page}
          </Link>
        )
      )}

      {/* 省略 + 最後のページ */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="w-9 h-9 flex items-center justify-center text-dark-muted/50 text-sm">…</span>
          )}
          <Link
            href={buildUrl(totalPages)}
            className="w-9 h-9 flex items-center justify-center text-sm text-dark-muted hover:text-dark-text bg-dark-card border border-dark-border rounded-lg hover:border-accent/50 transition"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* 次へ */}
      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="flex items-center gap-1 px-3 py-2 text-sm text-dark-muted hover:text-dark-text bg-dark-card border border-dark-border rounded-lg hover:border-accent/50 transition"
        >
          <span className="hidden sm:inline">次へ</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-3 py-2 text-sm text-dark-muted/30 bg-dark-card/50 border border-dark-border/50 rounded-lg cursor-not-allowed">
          <span className="hidden sm:inline">次へ</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </nav>
  );
}
