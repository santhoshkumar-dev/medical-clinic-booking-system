"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth/auth-client";

interface Booking {
  _id: string;
  correlationId: string;
  customerName: string;
  services: Array<{ id: string; name: string; price: number }>;
  basePrice: number;
  finalPrice: number;
  discountApplied: boolean;
  discountAmount: number;
  status: string;
  referenceId?: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: session, isPending: sessionPending } = useSession();

  useEffect(() => {
    if (session && (session.user as any).role === "user") {
      fetchBookings();
    } else if (!sessionPending && !session) {
      setLoading(false);
    } else if (session && (session.user as any).role !== "user") {
      setLoading(false);
    }
  }, [session, sessionPending]);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/user/bookings");

      if (res.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError("Failed to load your bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      confirmed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    const labels: Record<string, string> = {
      confirmed: "✓ Confirmed",
      pending: "⏳ Pending",
      failed: "✗ Failed",
      pricing_calculated: "⏳ Processing",
      quota_reserved: "⏳ Processing",
      payment_completed: "⏳ Finalizing",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (sessionPending || (loading && session)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">
          Loading your history...
        </div>
      </div>
    );
  }

  if (!session || (session.user as any).role !== "user") {
    const userRole = (session?.user as any)?.role;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-xl">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto text-3xl">
            {userRole === "admin" ? "👮" : "🔐"}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {userRole === "admin" ? "Admin Access Only" : "Sign In Required"}
            </h2>
            <p className="text-slate-600">
              {userRole === "admin"
                ? "You are currently signed in as an administrator. Please sign in with a regular user account to view personal booking history."
                : "Please sign in or create an account to view your booking history."}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/auth/login" className="w-full">
              <button className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                {userRole === "admin" ? "Sign In as Regular User" : "Sign In"}
              </button>
            </Link>
            {!session && (
              <Link href="/auth/signup" className="w-full">
                <button className="w-full h-11 border border-primary text-primary rounded-lg font-medium hover:bg-primary/5 transition-colors">
                  Create Account
                </button>
              </Link>
            )}
            {userRole === "admin" && (
              <Link href="/admin" className="w-full">
                <button className="w-full h-11 border border-slate-200 bg-white rounded-lg font-medium hover:bg-slate-50 transition-colors">
                  Back to Admin Dashboard
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">📋 My Bookings</h1>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline">Book New</Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
            {error}
          </div>
        )}

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-500 mb-4">
                You haven&apos;t made any bookings yet.
              </p>
              <Link href="/">
                <Button>Book an Appointment</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {booking.referenceId || booking.correlationId.slice(0, 8)}
                    </CardTitle>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Services</div>
                      <div className="font-medium">
                        {booking.services.map((s) => s.name).join(", ")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Amount</div>
                      <div className="font-medium">
                        ₹{booking.finalPrice.toLocaleString()}
                        {booking.discountApplied && (
                          <span className="text-green-600 text-sm ml-2">
                            (Saved ₹{booking.discountAmount})
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Booked On</div>
                      <div className="font-medium">
                        {new Date(booking.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
