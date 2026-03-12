"use client";

import { useState, useRef, useCallback } from "react";

interface ThumbnailUploadProps {
  currentUrl: string | null;
  onFileSelect: (file: File | null) => void;
  previewUrl: string | null;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ThumbnailUpload({
  currentUrl,
  onFileSelect,
  previewUrl,
  disabled = false,
}: ThumbnailUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentUrl;

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "ファイルサイズは5MB以下にしてください";
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "対応形式: JPEG, PNG, WebP, GIF";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // リセットして同じファイルを再選択可能に
      e.target.value = "";
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setError(null);
    onFileSelect(null);
  }, [onFileSelect]);

  return (
    <div>
      {displayUrl ? (
        <div className="relative aspect-video rounded-lg overflow-hidden border border-dark-border">
          <img
            src={displayUrl}
            alt="サムネイル"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm backdrop-blur-sm transition"
              >
                変更
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="bg-red-500/40 hover:bg-red-500/60 text-white px-3 py-1.5 rounded-lg text-sm backdrop-blur-sm transition"
              >
                削除
              </button>
            </div>
          )}
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded-lg cursor-pointer transition ${
            dragOver
              ? "border-accent bg-accent/10"
              : "border-dark-border hover:border-accent/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <svg
            className="w-10 h-10 text-dark-muted/40 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-dark-muted">
            画像をドラッグ＆ドロップまたはクリック
          </span>
          <span className="text-xs text-dark-muted/60 mt-1">
            JPEG, PNG, WebP, GIF（最大5MB）
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
          />
        </label>
      )}

      {/* 画像があるときの隠しinput */}
      {displayUrl && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      )}

      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
