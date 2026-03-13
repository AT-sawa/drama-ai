"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ backgroundColor: "#0f1419", color: "#e1e5ea", fontFamily: "sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "4rem", fontWeight: "bold", color: "#ef4444", marginBottom: "1rem" }}>500</p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>重大なエラーが発生しました</h1>
            <p style={{ color: "#8899a6", marginBottom: "2rem" }}>
              ページの読み込み中にエラーが発生しました。
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: "#ff6b35",
                color: "white",
                fontWeight: 600,
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
