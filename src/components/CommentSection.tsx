"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Comment {
  id: string;
  user_id: string;
  drama_id: string;
  content: string;
  rating: number | null;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface Props {
  dramaId: string;
  isLoggedIn: boolean;
  currentUserId?: string;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}週間前`;

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StarRating({
  rating,
  onChange,
  readonly = false,
  size = "md",
}: {
  rating: number;
  onChange?: (r: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(0);
  const starSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => onChange?.(star)}
        >
          <svg
            className={`${starSize} ${
              star <= (hovered || rating)
                ? "text-yellow-400"
                : "text-dark-border"
            } transition-colors`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function CommentSection({ dramaId, isLoggedIn, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchComments = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/drama/${dramaId}/comments?page=${p}`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments);
        setTotalCount(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [dramaId]);

  useEffect(() => {
    fetchComments(page);
  }, [page, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/drama/${dramaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          rating: newRating > 0 ? newRating : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "投稿に失敗しました");
        return;
      }

      // 投稿成功：先頭に追加
      setComments((prev) => [data.comment, ...prev]);
      setTotalCount((prev) => prev + 1);
      setNewComment("");
      setNewRating(0);
      // 1ページ目に戻す
      if (page !== 1) setPage(1);
    } catch {
      setError("投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return;
    setDeletingId(commentId);

    try {
      const res = await fetch(
        `/api/drama/${dramaId}/comments?commentId=${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setTotalCount((prev) => prev - 1);
      }
    } catch {
      // ignore
    }
    setDeletingId(null);
  };

  // 平均レーティング計算
  const ratedComments = comments.filter((c) => c.rating);
  const avgRating =
    ratedComments.length > 0
      ? ratedComments.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedComments.length
      : 0;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
        <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        レビュー・コメント
        <span className="text-dark-muted text-sm font-normal">
          ({totalCount}件)
        </span>
      </h2>

      {/* 平均評価 */}
      {avgRating > 0 && (
        <div className="flex items-center gap-3 mb-6 bg-dark-card border border-dark-border rounded-lg px-4 py-3">
          <span className="text-2xl font-bold text-yellow-400">{avgRating.toFixed(1)}</span>
          <StarRating rating={Math.round(avgRating)} readonly size="sm" />
          <span className="text-sm text-dark-muted">
            ({ratedComments.length}件の評価)
          </span>
        </div>
      )}

      {/* 投稿フォーム */}
      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            {/* 評価 */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm text-dark-muted">評価:</span>
              <StarRating
                rating={newRating}
                onChange={(r) => setNewRating(r === newRating ? 0 : r)}
              />
              {newRating > 0 && (
                <button
                  type="button"
                  onClick={() => setNewRating(0)}
                  className="text-xs text-dark-muted hover:text-dark-text transition"
                >
                  クリア
                </button>
              )}
            </div>

            {/* テキスト入力 */}
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="この作品の感想を書いてください..."
              maxLength={500}
              rows={3}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-accent transition resize-none"
            />

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-dark-muted">
                {newComment.length}/500
              </span>
              {error && (
                <span className="text-xs text-red-400">{error}</span>
              )}
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                {submitting ? "投稿中..." : "投稿する"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-dark-card border border-dark-border rounded-xl text-center text-sm text-dark-muted">
          コメントを投稿するには
          <Link href="/login" className="text-accent hover:underline mx-1">
            ログイン
          </Link>
          してください。
        </div>
      )}

      {/* コメント一覧 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-dark-card border border-dark-border rounded-xl p-4"
            >
              {/* ヘッダー */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* アバター */}
                  <Link
                    href={`/creator/${comment.user.id}`}
                    className="flex-shrink-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold text-accent">
                      {comment.user.display_name.charAt(0).toUpperCase()}
                    </div>
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/creator/${comment.user.id}`}
                        className="text-sm font-semibold hover:text-accent transition truncate"
                      >
                        {comment.user.display_name}
                      </Link>
                      {comment.rating && (
                        <StarRating rating={comment.rating} readonly size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-dark-muted/60">
                      {formatTimeAgo(comment.created_at)}
                    </p>
                  </div>
                </div>

                {/* 削除ボタン（自分のコメントのみ） */}
                {currentUserId === comment.user_id && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="text-dark-muted/40 hover:text-red-400 transition flex-shrink-0 p-1"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* コメント本文 */}
              <p className="mt-3 text-sm text-dark-text/90 leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm text-dark-muted bg-dark-card border border-dark-border rounded-lg disabled:opacity-30 hover:border-accent/50 transition"
              >
                前へ
              </button>
              <span className="text-sm text-dark-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm text-dark-muted bg-dark-card border border-dark-border rounded-lg disabled:opacity-30 hover:border-accent/50 transition"
              >
                次へ
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-dark-muted">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>まだコメントはありません</p>
          <p className="text-sm text-dark-muted/60 mt-1">最初のレビューを投稿しましょう！</p>
        </div>
      )}
    </section>
  );
}
