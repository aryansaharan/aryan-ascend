import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

/**
 * Browser tab icon: serif italic "A" on cream, matching the Ascend
 * wordmark's editorial accent letter.
 */
export default function Icon() {
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
          color: "#0A0A0A",
          fontFamily: "serif",
          fontStyle: "italic",
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: "-0.02em",
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
