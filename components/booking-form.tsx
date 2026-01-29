"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingFormData {
  customerName: string;
  gender: "male" | "female" | "";
  dateOfBirth: string;
}

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => void;
  disabled?: boolean;
  initialData?: {
    customerName: string;
    gender: "male" | "female";
    dateOfBirth: string;
  } | null;
}

export function BookingForm({
  onSubmit,
  disabled,
  initialData,
}: BookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    customerName: initialData?.customerName || "",
    gender: initialData?.gender || "",
    dateOfBirth: initialData?.dateOfBirth || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.customerName && formData.gender && formData.dateOfBirth) {
      onSubmit(formData);
    }
  };

  const isValid =
    formData.customerName && formData.gender && formData.dateOfBirth;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <span className="text-2xl">👤</span> Patient Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="customerName" className="text-sm font-medium">
              Full Name
            </Label>
            <Input
              id="customerName"
              type="text"
              placeholder="Enter your full name"
              value={formData.customerName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customerName: e.target.value,
                }))
              }
              disabled={disabled}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender" className="text-sm font-medium">
              Gender
            </Label>
            <Select
              value={formData.gender}
              onValueChange={(value: "male" | "female") =>
                setFormData((prev) => ({ ...prev, gender: value }))
              }
              disabled={disabled}
            >
              <SelectTrigger id="gender" className="h-11">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth" className="text-sm font-medium">
              Date of Birth
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dateOfBirth: e.target.value,
                }))
              }
              disabled={disabled}
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 mt-4"
            disabled={disabled || !isValid}
          >
            Continue to Services
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
