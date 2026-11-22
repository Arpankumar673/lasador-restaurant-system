import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../../types/database.types";
import { getClientEnv } from "../validations/env";

const PUBLIC_AUTH_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
];

/**
 * Updates user session cookies and enforces server-side route guards for admin paths.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const env = getClientEnv();

  // If Supabase credentials are placeholder during testing/mocking, pass through gracefully
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  ) {
    return response;
  }

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/kitchen") ||
    pathname.startsWith("/bar");
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some((p) => pathname.startsWith(p));

  // 1. Fast path for public non-auth routes (e.g. customer QR menu /t/*, guest landing /, /api/health)
  // Skip expensive auth API roundtrips entirely.
  if (!isProtectedPath && !isPublicAuthPath) {
    return response;
  }

  // 2. Fast path for unauthenticated access to protected routes
  // If no Supabase auth token cookie exists, redirect immediately without network overhead.
  const hasAuthTokenCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (isProtectedPath && !isPublicAuthPath && !hasAuthTokenCookie) {
    const redirectUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      redirectUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Authenticate active user session
  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (error) {
    console.warn("Middleware auth getUser warning:", error);
  }

  // 4. If trying to access protected staff route while unauthenticated
  if (isProtectedPath && !isPublicAuthPath && !user) {
    const redirectUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      redirectUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 5. If trying to access /admin/login while already authenticated
  if (isPublicAuthPath && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}
