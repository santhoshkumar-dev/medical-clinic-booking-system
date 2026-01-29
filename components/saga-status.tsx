"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface SagaEvent {
  eventType: string;
  service: string;
  status: "success" | "failure" | "compensation";
  timestamp: string;
  data: Record<string, unknown>;
}

interface BookingDetails {
  customerName: string;
  status: string;
  referenceId?: string;
  finalPrice?: number;
  discountApplied?: boolean;
  errorMessage?: string;
}

interface SagaStatusProps {
  correlationId: string;
  onClose: () => void;
}

const EVENT_ICONS: Record<string, string> = {
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
  PaymentReversed: "↩️",
};

const EVENT_LABELS: Record<string, string> = {
  BookingRequested: "Booking Request Received",
  PricingCalculated: "Price Calculated",
  DiscountQuotaReserved: "Discount Quota Reserved",
  DiscountQuotaRejected: "Discount Quota Rejected",
  PaymentCompleted: "Payment Processed",
  PaymentFailed: "Payment Failed",
  BookingConfirmed: "Booking Confirmed",
  BookingFailed: "Booking Failed",
  CompensationTriggered: "Compensation Started",
  DiscountQuotaReleased: "Quota Released",
  PaymentReversed: "Payment Reversed",
};

export function SagaStatus({ correlationId, onClose }: SagaStatusProps) {
  const [events, setEvents] = useState<SagaEvent[]>([]);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function pollStatus() {
      try {
        const response = await fetch(`/api/booking/${correlationId}/status`);
        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }

        const data = await response.json();
        setEvents(data.events);
        setBooking(data.booking);
        setIsComplete(data.isComplete);

        if (data.isComplete) {
          clearInterval(intervalId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        clearInterval(intervalId);
      }
    }

    // Poll immediately and then every 500ms
    pollStatus();
    intervalId = setInterval(pollStatus, 500);

    return () => clearInterval(intervalId);
  }, [correlationId]);

  const isSuccess = booking?.status === "confirmed";
  const isFailed = booking?.status === "failed";

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <span className="text-2xl">
              {isComplete ? (isSuccess ? "✅" : "❌") : "⏳"}
            </span>
            Booking Status
          </CardTitle>
          <Badge
            variant={
              isComplete ? (isSuccess ? "default" : "destructive") : "secondary"
            }
          >
            {isComplete
              ? isSuccess
                ? "Confirmed"
                : "Failed"
              : "Processing..."}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Event Timeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Event Timeline
          </h3>
          <div className="space-y-1">
            {events.map((event, index) => (
              <EventItem key={index} event={event} />
            ))}
            {!isComplete && (
              <div className="flex items-center gap-3 p-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm">⏳</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Waiting for next event...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Result Card */}
        {isComplete && booking && (
          <>
            <Separator />
            {isSuccess ? (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    Booking Confirmed!
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-green-600 dark:text-green-500">
                    Reference ID:
                  </span>
                  <span className="font-mono font-bold text-green-700 dark:text-green-400">
                    {booking.referenceId}
                  </span>
                  <span className="text-green-600 dark:text-green-500">
                    Final Amount:
                  </span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    ₹{(booking.finalPrice ?? 0).toLocaleString("en-IN")}
                  </span>
                  {booking.discountApplied && (
                    <>
                      <span className="text-green-600 dark:text-green-500">
                        Discount:
                      </span>
                      <span className="font-medium text-green-700 dark:text-green-400">
                        12% Applied ✓
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">😞</span>
                  <h3 className="font-semibold text-red-700 dark:text-red-400">
                    Booking Failed
                  </h3>
                </div>
                <p className="text-sm text-red-600 dark:text-red-500">
                  {booking.errorMessage || "An unexpected error occurred."}
                </p>
              </div>
            )}
          </>
        )}

        {/* Correlation ID */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <span>Tracking ID: </span>
          <span className="font-mono">{correlationId}</span>
        </div>

        {/* Close Button */}
        {isComplete && (
          <Button className="w-full h-11" onClick={onClose}>
            {isSuccess ? "Book Another Appointment" : "Try Again"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EventItem({ event }: { event: SagaEvent }) {
  const icon = EVENT_ICONS[event.eventType] || "📌";
  const label = EVENT_LABELS[event.eventType] || event.eventType;

  const statusColor =
    event.status === "success"
      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
      : event.status === "failure"
        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${statusColor}`}>
      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
        <span className="text-sm">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs opacity-70 ml-2">{event.service}</span>
      </div>
      <span className="text-xs opacity-70">
        {new Date(event.timestamp).toLocaleTimeString("en-IN")}
      </span>
    </div>
  );
}
