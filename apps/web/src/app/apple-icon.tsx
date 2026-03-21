import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #171717 0%, #ea580c 140%)",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            fontStyle: "italic",
            color: "#fafafa",
            letterSpacing: "-0.04em",
          }}
        >
          P
        </div>
      </div>
    ),
    { ...size }
  );
}
