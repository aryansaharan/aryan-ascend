import { ImageResponse } from "next/og";

export const alt = "Ascend: Find your next skill in 15 minutes.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

/**
 * Programmatic Open Graph image.
 *
 * Light-theme, editorial composition that mirrors the landing aurora:
 * cream paper, soft peach + lilac blooms, large serif-italic "Ascend"
 * wordmark, and the tagline in restrained sans.
 *
 * Note (Next 16): no fonts are loaded, so type renders with Satori's
 * built-in fallback. That keeps the build hermetic and avoids any
 * external font fetch.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 96px",
          backgroundColor: "#FAFAF9",
          backgroundImage: [
            "radial-gradient(620px 460px at 6% 14%, rgba(255, 197, 122, 0.95) 0%, rgba(255, 197, 122, 0) 62%)",
            "radial-gradient(560px 520px at 28% 52%, rgba(253, 148, 165, 0.78) 0%, rgba(253, 148, 165, 0) 60%)",
            "radial-gradient(680px 560px at 78% 18%, rgba(190, 175, 255, 0.92) 0%, rgba(190, 175, 255, 0) 60%)",
            "radial-gradient(520px 480px at 96% 78%, rgba(252, 197, 230, 0.85) 0%, rgba(252, 197, 230, 0) 62%)",
            "radial-gradient(440px 420px at 14% 88%, rgba(255, 232, 192, 0.7) 0%, rgba(255, 232, 192, 0) 60%)",
          ].join(", "),
          color: "#0A0A0A",
          position: "relative",
        }}
      >
        {/* Top row: wordmark + small label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              color: "#0A0A0A",
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontStyle: "italic",
                fontFamily: "serif",
                lineHeight: 1,
              }}
            >
              A
            </span>
            <span
              style={{
                fontSize: 36,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                marginLeft: 2,
                lineHeight: 1,
              }}
            >
              scend
            </span>
          </div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B7280",
              fontWeight: 500,
            }}
          >
            NextLeap MVP
          </div>
        </div>

        {/* Headline block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#6B7280",
              marginBottom: 32,
              fontWeight: 500,
            }}
          >
            A 15-minute decision session
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 124,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#0A0A0A",
              fontWeight: 600,
            }}
          >
            <span>Find your next</span>
            <span
              style={{
                fontStyle: "italic",
                fontFamily: "serif",
                fontWeight: 400,
                marginLeft: 24,
              }}
            >
              skill
            </span>
            <span style={{ marginLeft: 24 }}>in 15 minutes.</span>
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            width: "100%",
            color: "#6B7280",
            fontSize: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 720,
              color: "#374151",
              fontSize: 24,
              lineHeight: 1.35,
            }}
          >
            Map your role, goals, and time. Narrow hundreds of courses into a 3
            to 5 shortlist you&rsquo;ll actually finish.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 20,
              color: "#6B7280",
              letterSpacing: "0.04em",
            }}
          >
            ascend.aryansaharan.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
