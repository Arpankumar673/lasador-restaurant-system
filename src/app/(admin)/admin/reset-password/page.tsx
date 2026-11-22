"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Lock, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      setIsLoading(false);
      return;
    }

    const result = await updatePassword(formData);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to reset password.");
    } else {
      setSuccessMessage(result.message || "Password updated successfully.");
      setTimeout(() => {
        router.push("/admin/login");
      }, 2500);
    }
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-asador-lg bg-gradient-to-br from-asador-ember to-asador-flame text-asador-parchment shadow-ember-glow">
            <Flame className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-asador-parchment">
            L&apos;ASADOR
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-asador-malt">
            Set New Password
          </p>
        </div>

        <Card className="border-asador-border bg-asador-card/90 shadow-card-elevation">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create New Password</CardTitle>
            <CardDescription>
              Enter a secure password (minimum 8 characters) for your staff account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <div className="mb-4 flex items-start space-x-2.5 rounded-asador border border-asador-hops/40 bg-asador-hops/15 p-3 text-xs text-asador-parchment">
                <CheckCircle2 className="h-4 w-4 text-[#5dd974] shrink-0 mt-0.5" />
                <span>{successMessage} Redirecting to login...</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 flex items-start space-x-2.5 rounded-asador border border-asador-flame/40 bg-asador-flame/15 p-3 text-xs text-asador-parchment">
                <AlertCircle className="h-4 w-4 text-asador-ember shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!successMessage && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="password">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-asador-ash" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="pl-9"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-asador-ash" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="pl-9"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  className="w-full mt-2"
                  isLoading={isLoading}
                >
                  Update Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center text-xs text-asador-silver hover:text-asador-parchment transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
