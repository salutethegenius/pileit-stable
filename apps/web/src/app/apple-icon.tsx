import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Stack + play mark (aligned with `icon.svg` / brand), not a letter "P". */
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
          background: "#0a0600",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 118,
            height: 104,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 9,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 17,
                width: "100%",
                borderRadius: 5,
                background: "linear-gradient(90deg, #fb923c 0%, #f97316 45%, #c2410c 100%)",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: 40,
              top: "50%",
              marginTop: -26,
              zIndex: 1,
              width: 0,
              height: 0,
              borderTop: "26px solid transparent",
              borderBottom: "26px solid transparent",
              borderLeft: "40px solid rgba(250, 250, 250, 0.92)",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
