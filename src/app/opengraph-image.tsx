import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Aevum — Precision longevity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
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
          backgroundColor: "#f8f5f0",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Subtle vertical rule */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 80,
            width: 1,
            height: 470,
            backgroundColor: "rgba(168,134,93,0.25)",
          }}
        />

        {/* Corner eyebrow */}
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 80,
            fontSize: 18,
            color: "#a8865d",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <span>Precision longevity</span>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1.5px solid #a8865d",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "1.5px solid #a8865d",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#a8865d",
                }}
              />
            </div>
          </div>
        </div>

        {/* byAEVUM wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            color: "#a8865d",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 90,
              fontStyle: "italic",
              fontWeight: 300,
              fontFamily: "serif",
              textTransform: "lowercase",
              marginRight: 16,
            }}
          >
            by
          </span>
          <span
            style={{
              fontSize: 180,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "serif",
            }}
          >
            Aevum
          </span>
        </div>

        {/* Italic subtitle */}
        <div
          style={{
            fontSize: 36,
            color: "#6b6560",
            fontStyle: "italic",
            fontFamily: "serif",
            letterSpacing: "-0.01em",
          }}
        >
          La arquitectura de una vida larga
        </div>

        {/* Bottom notation */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 80,
            fontSize: 14,
            color: "#a8865d",
            fontFamily: "monospace",
            letterSpacing: "0.1em",
          }}
        >
          0.785 AE — [HSPAN]
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 80,
            right: 80,
            fontSize: 14,
            color: "#6b6560",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
          }}
        >
          Est. 2026
        </div>
      </div>
    ),
    { ...size }
  );
}
