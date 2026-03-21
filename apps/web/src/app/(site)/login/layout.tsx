import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Sign in to PileIt to watch Bahamian creators, manage your profile, tips, and subscriptions.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Log in | PileIt",
    description:
      "Sign in to PileIt to watch Bahamian creators and manage your account.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Log in | PileIt",
    description:
      "Sign in to PileIt to watch Bahamian creators and manage your account.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
