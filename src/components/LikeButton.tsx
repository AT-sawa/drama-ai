"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LikeButtonProps {
  dramaId: string;
  initialLikesCount: number;
  initialIsLiked: boolean;
  isLoggedIn: boolean;
  size?: "sm" | "md";
}

export function LikeButton({
  dramaId,
  initialLikesCount,
  initialIsLiked,
  isLoggedIn,
  size = "md",
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    if (loading) return;

    // 楽観的UI更新
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    setLoading(true);

    try {
      const res = await fetch(`/api/drama/${dramaId}/like`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.is_liked);
        setLikesCount(data.likes_count);
      } else {
        // ロールバック
        setIsLiked(isLiked);
        setLikesCount(likesCount);
      }
    } catch {
      // ロールバック
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    } finally {
      setLoading(false);
    }
  }

  const isSm = size === "sm";

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1 transition group ${
        isSm ? "text-xs" : "text-sm"
      }`}
      title={isLiked ? "いいねを取り消す" : "いいね"}
    >
      <svg
        className={`transition ${isSm ? "w-4 h-4" : "w-5 h-5"} ${
          isLiked
            ? "text-red-500 fill-red-500"
            : "text-dark-muted group-hover:text-red-400"
        }`}
        fill={isLiked ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span className={isLiked ? "text-red-500" : "text-dark-muted"}>
        {likesCount}
      </span>
    </button>
  );
}
