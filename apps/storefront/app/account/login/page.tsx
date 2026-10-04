import type { Metadata } from "next";

import { AuthFlow } from "../../../components/auth-flow";

export const metadata: Metadata = {
  title: "Log in — BACH Wears",
  description: "Log in to your BACH Wears account to track orders, keep your favourites and sizes, and receive your birthday gift.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <div className="min-h-dvh bg-background">
      <AuthFlow initial="email" />
    </div>
  );
}
