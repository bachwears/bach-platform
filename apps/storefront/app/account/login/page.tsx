import { AuthFlow } from "../../../components/auth-flow";

export default function Page() {
  return (
    <div className="min-h-dvh bg-background">
      <AuthFlow initial="email" />
    </div>
  );
}
