"use client";

import { useState, useEffect } from "react";
import { BookingForm } from "@/components/booking-form";
import { ServiceSelector } from "@/components/service-selector";
import { BookingSummary } from "@/components/booking-summary";
import { SagaStatus } from "@/components/saga-status";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/user-nav";
import { useSession } from "@/lib/auth/auth-client";
import Link from "next/link";

interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

type Step = "form" | "services" | "summary" | "status";

interface FormData {
  customerName: string;
  gender: "male" | "female";
  dateOfBirth: string;
}

interface BookingState {
  step: Step;
  formData: FormData | null;
  selectedServiceIds: string[];
  servicesData: ServiceItem[];
  correlationId: string | null;
}

const STORAGE_KEY = "medibook_booking_state";

function loadState(): BookingState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load booking state:", e);
  }
  return null;
}

function saveState(state: BookingState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save booking state:", e);
  }
}

function clearState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear booking state:", e);
  }
}

export default function BookingPage() {
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState<FormData | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [servicesData, setServicesData] = useState<ServiceItem[]>([]);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: session, isPending: sessionPending } = useSession();

  // Load saved state on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      // Don't restore to status step if there's no correlationId
      if (saved.step === "status" && !saved.correlationId) {
        setStep("form");
      } else {
        setStep(saved.step);
        setFormData(saved.formData);
        setSelectedServiceIds(saved.selectedServiceIds);
        setServicesData(saved.servicesData);
        setCorrelationId(saved.correlationId);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save state on changes (except when on status page with completed booking)
  useEffect(() => {
    if (!isLoaded) return;

    saveState({
      step,
      formData,
      selectedServiceIds,
      servicesData,
      correlationId,
    });
  }, [
    step,
    formData,
    selectedServiceIds,
    servicesData,
    correlationId,
    isLoaded,
  ]);

  const handleFormSubmit = (data: {
    customerName: string;
    gender: "male" | "female" | "";
    dateOfBirth: string;
  }) => {
    if (data.gender === "") return;
    setFormData({ ...data, gender: data.gender });
    setStep("services");
  };

  const handleServicesNext = async () => {
    // Fetch full service details for selected IDs
    try {
      const response = await fetch(`/api/services?gender=${formData?.gender}`);
      const data = await response.json();

      const selected = data.services.filter((s: ServiceItem) =>
        selectedServiceIds.includes(s.id),
      );
      setServicesData(selected);
      setStep("summary");
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  const handleSubmitBooking = async () => {
    if (!formData || selectedServiceIds.length === 0) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          serviceIds: selectedServiceIds,
        }),
      });

      const data = await response.json();

      if (data.correlationId) {
        setCorrelationId(data.correlationId);
        setStep("status");
      } else {
        console.error("Booking failed:", data.error);
      }
    } catch (error) {
      console.error("Failed to submit booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    clearState(); // Clear localStorage on reset
    setStep("form");
    setFormData(null);
    setSelectedServiceIds([]);
    setServicesData([]);
    setCorrelationId(null);
  };

  // Don't render until state is loaded to prevent flash
  if (!isLoaded || sessionPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user as any).role !== "user") {
    const userRole = (session?.user as any)?.role;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏥</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    MediBook Clinic
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Book your medical services online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <UserNav />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-xl">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto text-3xl">
              {userRole === "admin" ? "👮" : "🔐"}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {userRole === "admin"
                  ? "Admin Access Only"
                  : "Sign In Required"}
              </h2>
              <p className="text-muted-foreground">
                {userRole === "admin"
                  ? "You are currently signed in as an administrator. Please sign in with a regular user account to book an appointment."
                  : "Please sign in or create an account to book your medical appointment."}
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
                  <button className="w-full h-11 border border-input bg-background rounded-lg font-medium hover:bg-accent transition-colors">
                    Back to Admin Dashboard
                  </button>
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏥</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  MediBook Clinic
                </h1>
                <p className="text-xs text-muted-foreground">
                  Book your medical services online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className="text-xs hidden sm:inline-flex"
              >
                SAGA Demo
              </Badge>
              <UserNav />
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { key: "form", label: "Patient Info", icon: "👤" },
            { key: "services", label: "Services", icon: "🏥" },
            { key: "summary", label: "Summary", icon: "📋" },
            { key: "status", label: "Status", icon: "⚡" },
          ].map((s, i) => {
            const steps: Step[] = ["form", "services", "summary", "status"];
            const currentIdx = steps.indexOf(step);
            const thisIdx = steps.indexOf(s.key as Step);
            const isPrevious = thisIdx < currentIdx;
            const isCurrent = step === s.key;
            const isCompleted = currentIdx > thisIdx;

            // Can only click on previous/completed steps (not status once submitted)
            const canNavigate = isPrevious && step !== "status";

            return (
              <div key={s.key} className="flex items-center">
                <button
                  type="button"
                  onClick={() => canNavigate && setStep(s.key as Step)}
                  disabled={!canNavigate}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                  } ${canNavigate ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                >
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < 3 && <div className="w-8 h-0.5 bg-muted mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {step === "form" && (
            <BookingForm onSubmit={handleFormSubmit} initialData={formData} />
          )}

          {step === "services" && formData && (
            <div className="space-y-4">
              <ServiceSelector
                gender={formData.gender}
                selectedServices={selectedServiceIds}
                onSelectionChange={setSelectedServiceIds}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 h-11 rounded-lg border border-input bg-background hover:bg-accent transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleServicesNext}
                  disabled={selectedServiceIds.length === 0}
                  className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "summary" && formData && (
            <BookingSummary
              customerName={formData.customerName}
              gender={formData.gender}
              dateOfBirth={formData.dateOfBirth}
              services={servicesData}
              onSubmit={handleSubmitBooking}
              onBack={() => setStep("services")}
              disabled={isSubmitting}
            />
          )}

          {step === "status" && correlationId && (
            <SagaStatus correlationId={correlationId} onClose={handleReset} />
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground mt-12 pb-8">
          <p>
            This demo showcases <strong>SAGA Choreography</strong> pattern with
            event-driven architecture.
          </p>
          <p className="mt-1">
            Each service reacts to events independently, with compensation logic
            for failure scenarios.
          </p>
        </footer>
      </div>
    </div>
  );
}
