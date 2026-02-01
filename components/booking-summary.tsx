"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

interface BookingSummaryProps {
  customerName: string;
  gender: "male" | "female";
  dateOfBirth: string;
  services: ServiceItem[];
  onSubmit: () => void;
  onBack: () => void;
  disabled?: boolean;
}

interface QuotaStatus {
  date: string;
  exhausted: boolean;
  used: number;
  limit: number;
  available: number;
}

export function BookingSummary({
  customerName,
  gender,
  dateOfBirth,
  services,
  onSubmit,
  onBack,
  disabled,
}: BookingSummaryProps) {
  const [discountPercentage, setDiscountPercentage] = useState<number>(12);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch discount percentage and quota status from API
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch both in parallel
        const [discountRes, quotaRes] = await Promise.all([
          fetch("/api/config/discount"),
          fetch("/api/quota/status"),
        ]);

        if (discountRes.ok) {
          const data = await discountRes.json();
          setDiscountPercentage(data.discountPercentage || 12);
        }

        if (quotaRes.ok) {
          const data = await quotaRes.json();
          setQuotaStatus(data); // API returns quota object directly
        }
      } catch (err) {
        console.error("Failed to fetch config:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const basePrice = services.reduce((sum, s) => sum + s.price, 0);

  // Check discount eligibility (R1 rule)
  const today = new Date();
  const dob = new Date(dateOfBirth);
  const isBirthday =
    today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth();

  const isBirthdayDiscount = gender === "female" && isBirthday;
  const isValueDiscount = basePrice > 1000;
  const discountEligible = isBirthdayDiscount || isValueDiscount;

  // Check if quota is exhausted (default to true if no data yet)
  const quotaExhausted = quotaStatus?.exhausted ?? true;
  const willGetDiscount = discountEligible && !quotaExhausted;

  console.log("willGetDiscount", willGetDiscount);
  console.log("quotaExhausted", quotaExhausted);
  console.log("discountEligible", discountEligible);
  console.log("quotaStatus", quotaStatus);

  const discountDecimal = discountPercentage / 100;
  const discountAmount = willGetDiscount
    ? Math.round(basePrice * discountDecimal)
    : 0;
  const finalPrice = basePrice - discountAmount;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <span className="text-2xl">📋</span> Booking Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Patient Details */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Patient Details
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{customerName}</span>
            <span className="text-muted-foreground">Gender:</span>
            <span className="font-medium capitalize">{gender}</span>
            <span className="text-muted-foreground">Date of Birth:</span>
            <span className="font-medium">
              {new Date(dateOfBirth).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <Separator />

        {/* Selected Services */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Selected Services
          </h3>
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.id} className="flex justify-between text-sm">
                <span>{service.name}</span>
                <span className="font-medium">
                  ₹{service.price.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Price Breakdown
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Base Price</span>
              <span>₹{basePrice.toLocaleString("en-IN")}</span>
            </div>

            {willGetDiscount && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-2">
                  Discount ({loading ? "..." : `${discountPercentage}%`})
                  <Badge variant="outline" className="text-xs bg-green-50">
                    {isBirthdayDiscount ? "🎂 Birthday" : "💰 Order Value"}
                  </Badge>
                </span>
                <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}

            {discountEligible && quotaExhausted && !loading && (
              <div className="flex justify-between text-amber-600">
                <span className="flex items-center gap-2">
                  Discount Not Available
                  <Badge variant="outline" className="text-xs bg-amber-50">
                    Quota Exhausted
                  </Badge>
                </span>
                <span>₹0</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-lg font-semibold">Total</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">
                ₹{finalPrice.toLocaleString("en-IN")}
              </span>
              {willGetDiscount && (
                <p className="text-xs text-green-600">
                  You save ₹{discountAmount.toLocaleString("en-IN")}!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Discount Status Info */}
        {loading ? (
          <div className="bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Checking discount eligibility...
            </p>
          </div>
        ) : willGetDiscount ? (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-700 dark:text-green-400">
              {isBirthdayDiscount
                ? `🎉 Happy Birthday! You're getting a ${discountPercentage}% birthday discount!`
                : `🎁 Order value exceeds ₹1,000. You're getting a ${discountPercentage}% discount!`}
            </p>
            {quotaStatus && (
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                Quota: {quotaStatus.available} of {quotaStatus.limit} available
                today
              </p>
            )}
          </div>
        ) : discountEligible && quotaExhausted ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ Daily discount quota may be exhausted.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              Your booking may be rejected if no quota is available.
            </p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-11"
            onClick={onBack}
            disabled={disabled}
          >
            Back
          </Button>
          <Button
            className="flex-1 h-11"
            onClick={onSubmit}
            disabled={disabled || services.length === 0}
          >
            {disabled ? "Processing..." : "Confirm & Pay"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
