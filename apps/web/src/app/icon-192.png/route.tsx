import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZE = 192;

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
            width: 126,
            height: 111,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 18,
                width: "100%",
                borderRadius: 5,
                background:
                  "linear-gradient(90deg, #fb923c 0%, #f97316 45%, #c2410c 100%)",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: 42,
              top: "50%",
              marginTop: -28,
              zIndex: 1,
              width: 0,
              height: 0,
              borderTop: "28px solid transparent",
              borderBottom: "28px solid transparent",
              borderLeft: "43px solid rgba(250, 250, 250, 0.92)",
            }}
          />
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
