import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Get the current session on the server side
 */
export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Require general authentication - redirects to login if not authenticated
 * Default redirect is to user login
 */
export async function requireAuth(redirectTo: string = "/auth/login") {
  const session = await getServerSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}

/**
 * Require user role - redirects to user login if not a regular user
 */
export async function requireUserAuth() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "user") {
    // If an admin tries to access user features, treat as unauthenticated
    // or we could show an error, but usually total scoping means they sign in separately
    redirect("/auth/login?error=no-user-role");
  }

  return session;
}

/**
 * Require admin role - redirects to admin login if not admin
 */
export async function requireAdmin() {
  const session = await getServerSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/login?error=unauthorized");
  }

  return session;
}

/**
 * Check if user is admin (non-redirecting)
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession();

  if (!session) {
    return false;
  }

  return session.user.role === "admin";
}

/**
 * Check if user is a regular user (non-redirecting)
 */
export async function isUser(): Promise<boolean> {
  const session = await getServerSession();

  if (!session) {
    return false;
  }

  return session.user.role === "user";
}
