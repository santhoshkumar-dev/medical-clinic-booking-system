"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SagaEvent {
  eventType: string;
  service: string;
  status: string;
  timestamp: string;
}

interface Booking {
  _id: string;
  correlationId: string;
  customerName: string;
  gender: string;
  status: string;
  basePrice?: number;
  finalPrice?: number;
  discountApplied?: boolean;
  referenceId?: string;
  createdAt: string;
  eventCount: number;
  lastEvent: SagaEvent | null;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [events, setEvents] = useState<SagaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/admin/bookings?limit=50");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to fetch bookings");
      }
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError("Failed to load bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (correlationId: string) => {
    try {
      const res = await fetch(`/api/booking/${correlationId}/status`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setSelectedBooking(correlationId);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
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
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, string> = {
      BookingRequested: "📝",
      PricingCalculated: "💰",
      DiscountQuotaReserved: "🎫",
      DiscountQuotaRejected: "❌",
      PaymentCompleted: "💳",
      PaymentFailed: "⚠️",
      BookingConfirmed: "✅",
      BookingFailed: "❌",
      CompensationTriggered: "🔄",
      DiscountQuotaReleased: "↩️",
    };
    return icons[eventType] || "📌";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">SAGA Monitoring</h1>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-slate-100 rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <p className="text-slate-500">No bookings found.</p>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((booking) => (
                      <div
                        key={booking._id}
                        onClick={() => fetchEvents(booking.correlationId)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedBooking === booking.correlationId
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {booking.customerName}
                            </div>
                            <div className="text-sm text-slate-500">
                              {booking.referenceId ||
                                booking.correlationId.slice(0, 8)}
                            </div>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(booking.status)}
                            <div className="text-sm text-slate-500 mt-1">
                              {booking.finalPrice
                                ? `₹${booking.finalPrice.toLocaleString()}`
                                : booking.basePrice
                                  ? `₹${booking.basePrice.toLocaleString()}`
                                  : "N/A"}
                              {booking.discountApplied && (
                                <span className="text-green-600 ml-1">
                                  (12% off)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                          {new Date(booking.createdAt).toLocaleString()} •{" "}
                          {booking.eventCount} events
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Event Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedBooking ? (
                  <p className="text-slate-500 text-sm">
                    Select a booking to view its SAGA events
                  </p>
                ) : events.length === 0 ? (
                  <p className="text-slate-500 text-sm">No events found</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="text-xl">
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {event.eventType}
                          </div>
                          <div className="text-xs text-slate-500">
                            {event.service}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <Badge
                          variant={
                            event.status === "success"
                              ? "default"
                              : event.status === "failure"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs h-5"
                        >
                          {event.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
