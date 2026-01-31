"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth/auth-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // Sign up new user
        const result = await signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });

        if (result.error) {
          setError(result.error.message || "Sign up failed");
          return;
        }

        setSuccess("Account created! You can now sign in.");
        setMode("signin");
        setPassword("");
        return;
      }

      // Sign in existing user
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Login failed");
        return;
      }

      // Redirect to admin dashboard
      router.push("/admin");
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            🏥 {mode === "signin" ? "Admin Login" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to access the admin panel"
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-red-500">Admin Email: admin@email.com</p>
            <p className="text-sm text-red-500">Admin Password: Test@123</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                {success}
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@clinic.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 8 characters" : ""}
                minLength={mode === "signup" ? 8 : undefined}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </Button>

            <div className="text-center text-sm text-slate-500">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
