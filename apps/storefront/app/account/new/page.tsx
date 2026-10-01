import type { Metadata } from "next";

import { AuthFlow } from "../../../components/auth-flow";

export const metadata: Metadata = { title: "Create an account — BACH Wears" };

export default function Page() {
  return (
    <div className="min-h-dvh bg-background">
      <AuthFlow initial="register" />
    </div>
  );
}
