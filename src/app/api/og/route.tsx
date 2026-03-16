import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") || "DramaAI";
  const description = searchParams.get("description") || "AIが紡ぐ新しい物語";
  const type = searchParams.get("type") || "default"; // default, drama, creator

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f1419 0%, #1a1f26 50%, #0f1419 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* 背景デコレーション */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,107,53,0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* ロゴ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontSize: "32px",
              fontWeight: 700,
              background: "linear-gradient(90deg, #ff6b35, #ff9a5c)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            DramaAI
          </span>
          {type !== "default" && (
            <span
              style={{
                fontSize: "18px",
                color: "#8899a6",
                marginLeft: "16px",
                borderLeft: "2px solid #2a3038",
                paddingLeft: "16px",
              }}
            >
              {type === "drama" ? "作品紹介" : "クリエイター"}
            </span>
          )}
        </div>

        {/* タイトル */}
        <div
          style={{
            fontSize: title.length > 20 ? "48px" : "56px",
            fontWeight: 800,
            color: "#e1e5ea",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.3,
            display: "flex",
            marginBottom: "16px",
          }}
        >
          {title}
        </div>

        {/* 説明文 */}
        {description && (
          <div
            style={{
              fontSize: "24px",
              color: "#8899a6",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            {description.length > 60
              ? description.substring(0, 60) + "..."
              : description}
          </div>
        )}

        {/* 下部ライン */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "3px",
              background: "#ff6b35",
              borderRadius: "2px",
              display: "flex",
            }}
          />
          <span style={{ fontSize: "16px", color: "#8899a6" }}>
            AI動画配信サービス
          </span>
          <div
            style={{
              width: "40px",
              height: "3px",
              background: "#ff6b35",
              borderRadius: "2px",
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
