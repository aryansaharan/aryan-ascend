import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

/**
 * iOS / iPadOS home-screen icon: serif italic "A" on cream with a faint
 * peach + lilac wash so the mark reads as part of the Ascend aurora.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAF9",
          backgroundImage: [
            "radial-gradient(120px 110px at 22% 18%, rgba(255, 197, 122, 0.85) 0%, rgba(255, 197, 122, 0) 65%)",
            "radial-gradient(140px 130px at 82% 78%, rgba(190, 175, 255, 0.85) 0%, rgba(190, 175, 255, 0) 65%)",
            "radial-gradient(120px 110px at 76% 22%, rgba(252, 197, 230, 0.8) 0%, rgba(252, 197, 230, 0) 65%)",
          ].join(", "),
          color: "#0A0A0A",
          fontFamily: "serif",
          fontStyle: "italic",
          fontSize: 140,
          fontWeight: 400,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        A
      </div>
    ),
    {
      ...size,
    },
  );
}
