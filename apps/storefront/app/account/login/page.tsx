import type { Metadata } from "next";

import { AuthFlow } from "../../../components/auth-flow";

export const metadata: Metadata = { title: "Log in — BACH Wears" };

export default function Page() {
  return (
    <div className="min-h-dvh bg-background">
      <AuthFlow initial="email" />
    </div>
  );
}
