import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Page not found | PileIt" },
  description: "The page you requested is missing or the link is invalid.",
  robots: { index: false, follow: true },
};

/**
 * Root not-found: required for global `/_not-found` prerender (Vercel build).
 * Keeps shared parent layouts (e.g. `(site)` Navbar) when notFound() is thrown under those routes.
 */
export default function NotFound() {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        minHeight: "40vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, fontStyle: "italic", margin: "0 0 16px" }}>
        Not found
      </h1>
      <p style={{ color: "rgba(255,255,255,0.65)", margin: "0 0 24px", maxWidth: 420 }}>
        That page or creator does not exist.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "10px 24px",
          backgroundColor: "#ea580c",
          color: "#fff",
          borderRadius: 8,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Back to Browse
      </Link>
    </div>
  );
}
