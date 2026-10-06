import { ChangePasswordForm } from "@bach/ui/components/auth/change-password-form";

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-background px-4 pb-24 pt-16 sm:items-center sm:pt-0">
      <div className="form-underline w-full max-w-sm space-y-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-bach.png" alt="BACH" className="mx-auto h-6 w-auto dark:invert" />
        <ChangePasswordForm />
      </div>
    </main>
  );
}
