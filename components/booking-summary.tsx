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
  const [loading, setLoading] = useState(true);

  // Fetch discount percentage from API
  useEffect(() => {
    async function fetchDiscount() {
      try {
        const res = await fetch("/api/config/discount");
        if (res.ok) {
          const data = await res.json();
          setDiscountPercentage(data.discountPercentage || 12);
        }
      } catch (err) {
        console.error("Failed to fetch discount config:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDiscount();
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

  const discountDecimal = discountPercentage / 100;
  const discountAmount = discountEligible
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

            {discountEligible && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-2">
                  Discount ({loading ? "..." : `${discountPercentage}%`})
                  <Badge variant="outline" className="text-xs">
                    {isBirthdayDiscount ? "🎂 Birthday" : "💰 Order Value"}
                  </Badge>
                </span>
                <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-lg font-semibold">Total</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">
                ₹{finalPrice.toLocaleString("en-IN")}
              </span>
              {discountEligible && (
                <p className="text-xs text-green-600">
                  You save ₹{discountAmount.toLocaleString("en-IN")}!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Discount Info */}
        {discountEligible && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-700 dark:text-green-400">
              {isBirthdayDiscount
                ? `🎉 Happy Birthday! You're eligible for a ${discountPercentage}% birthday discount.`
                : `🎁 Order value exceeds ₹1,000. You're eligible for a ${discountPercentage}% discount.`}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              * Subject to daily discount quota availability
            </p>
          </div>
        )}

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
            {disabled ? "Processing..." : "Submit Request"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
