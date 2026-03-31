import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZE = 512;

export async function GET() {
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
            width: 336,
            height: 296,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 26,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 48,
                width: "100%",
                borderRadius: 14,
                background:
                  "linear-gradient(90deg, #fb923c 0%, #f97316 45%, #c2410c 100%)",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: 112,
              top: "50%",
              marginTop: -74,
              zIndex: 1,
              width: 0,
              height: 0,
              borderTop: "74px solid transparent",
              borderBottom: "74px solid transparent",
              borderLeft: "114px solid rgba(250, 250, 250, 0.92)",
            }}
          />
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
