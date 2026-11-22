"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInStaff } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Lock, Mail, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await signInStaff(formData);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to sign in. Please check your credentials.");
      setIsLoading(false);
    } else {
      router.push(nextPath);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Monogram */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-asador-lg bg-gradient-to-br from-asador-ember to-asador-flame text-asador-parchment shadow-ember-glow">
            <Flame className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-asador-parchment">
            L&apos;ASADOR
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-asador-malt">
            Staff & Management Portal &bull; Mohali
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-asador-border bg-asador-card/90 shadow-card-elevation backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Staff Sign In</CardTitle>
            <CardDescription>
              Enter your authorized credentials to access restaurant operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 flex items-start space-x-2.5 rounded-asador border border-asador-flame/40 bg-asador-flame/15 p-3 text-xs text-asador-parchment">
                <AlertCircle className="h-4 w-4 text-asador-ember shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="email">
                  Staff Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-asador-ash" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="staff@lasador.in"
                    required
                    autoComplete="email"
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-asador-silver" htmlFor="password">
                    Password
                  </label>
                  <Link
                    href="/admin/forgot-password"
                    className="text-xs text-asador-malt hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-asador-ash" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="pl-9 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-asador-ash hover:text-asador-parchment"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Sign In to Console
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-xs text-asador-silver hover:text-asador-parchment transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Return to Guest Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
