"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MedicalService {
  id: string;
  name: string;
  price: number;
  gender: "male" | "female" | "common";
  description: string;
}

interface ServiceSelectorProps {
  gender: "male" | "female";
  selectedServices: string[];
  onSelectionChange: (services: string[]) => void;
  disabled?: boolean;
}

export function ServiceSelector({
  gender,
  selectedServices,
  onSelectionChange,
  disabled,
}: ServiceSelectorProps) {
  const [services, setServices] = useState<MedicalService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch(`/api/services?gender=${gender}`);
        const data = await response.json();
        setServices(data.services);
      } catch (error) {
        console.error("Failed to fetch services:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [gender]);

  const handleToggle = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      onSelectionChange(selectedServices.filter((id) => id !== serviceId));
    } else {
      onSelectionChange([...selectedServices, serviceId]);
    }
  };

  const totalPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-center">
          <div className="animate-pulse text-muted-foreground">
            Loading services...
          </div>
        </CardContent>
      </Card>
    );
  }

  const commonServices = services.filter((s) => s.gender === "common");
  const specializedServices = services.filter((s) => s.gender === gender);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <span className="text-2xl">🏥</span> Select Medical Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Common Services */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            General Services
          </h3>
          <div className="space-y-2">
            {commonServices.map((service) => (
              <ServiceItem
                key={service.id}
                service={service}
                selected={selectedServices.includes(service.id)}
                onToggle={() => handleToggle(service.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Specialized Services */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {gender === "female" ? "Women's Health" : "Men's Health"}
          </h3>
          <div className="space-y-2">
            {specializedServices.map((service) => (
              <ServiceItem
                key={service.id}
                service={service}
                selected={selectedServices.includes(service.id)}
                onToggle={() => handleToggle(service.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-semibold">
            {selectedServices.length} service
            {selectedServices.length !== 1 ? "s" : ""} selected
          </span>
          <span className="text-2xl font-bold text-primary">
            ₹{totalPrice.toLocaleString("en-IN")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ServiceItemProps {
  service: MedicalService;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ServiceItem({
  service,
  selected,
  onToggle,
  disabled,
}: ServiceItemProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
        selected
          ? "bg-primary/5 border-primary"
          : "hover:bg-muted/50 border-border"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={() => !disabled && onToggle()}
    >
      <Checkbox
        id={service.id}
        checked={selected}
        onCheckedChange={() => !disabled && onToggle()}
        disabled={disabled}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <Label
          htmlFor={service.id}
          className="text-sm font-medium cursor-pointer"
        >
          {service.name}
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {service.description}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0">
        ₹{service.price.toLocaleString("en-IN")}
      </Badge>
    </div>
  );
}
