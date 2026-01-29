"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Service {
  id: string;
  name: string;
  gender: string;
  description: string;
  defaultPrice: number;
  customPrice?: number;
  currentPrice: number;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(12);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit states
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [newDiscount, setNewDiscount] = useState(12);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/services");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to fetch data");
      }
      const data = await res.json();
      setServices(data.services || []);
      setDiscountPercentage(data.discountPercentage || 12);
      setNewDiscount(data.discountPercentage || 12);
    } catch (err) {
      setError("Failed to load service configuration");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateDiscount = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountPercentage: newDiscount }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setDiscountPercentage(newDiscount);
      setEditingDiscount(false);
      setSuccess("Discount percentage updated successfully");
    } catch (err) {
      setError("Failed to update discount percentage");
    } finally {
      setSaving(false);
    }
  };

  const updatePrice = async (serviceId: string) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, price: newPrice }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setServices(
        services.map((s) =>
          s.id === serviceId
            ? { ...s, customPrice: newPrice, currentPrice: newPrice }
            : s,
        ),
      );
      setEditingService(null);
      setSuccess(`Price updated successfully`);
    } catch (err) {
      setError("Failed to update service price");
    } finally {
      setSaving(false);
    }
  };

  const getGenderBadge = (gender: string) => {
    const colors: Record<string, string> = {
      common: "bg-slate-100 text-slate-800",
      female: "bg-pink-100 text-pink-800",
      male: "bg-blue-100 text-blue-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[gender]}`}>
        {gender}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          Service & Pricing Management
        </h1>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 mb-6">
            {success}
          </div>
        )}

        {/* Discount Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Discount Configuration (R1 Rule)</CardTitle>
          </CardHeader>
          <CardContent>
            {editingDiscount ? (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Discount Percentage</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="w-32"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-6">
                  <Button onClick={updateDiscount} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingDiscount(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-emerald-600">
                    {discountPercentage}%
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Applied to eligible bookings (female birthday or order &gt;
                    ₹1,000)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewDiscount(discountPercentage);
                    setEditingDiscount(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Prices */}
        <Card>
          <CardHeader>
            <CardTitle>Service Prices</CardTitle>
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
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                        {getGenderBadge(service.gender)}
                        {service.customPrice && (
                          <Badge variant="secondary">Custom</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {service.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {editingService === service.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">₹</span>
                          <Input
                            type="number"
                            value={newPrice}
                            onChange={(e) =>
                              setNewPrice(Number(e.target.value))
                            }
                            min={0}
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            onClick={() => updatePrice(service.id)}
                            disabled={saving}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingService(null)}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="text-right">
                            <div className="font-bold">
                              ₹{service.currentPrice.toLocaleString()}
                            </div>
                            {service.customPrice && (
                              <div className="text-xs text-slate-400 line-through">
                                Default: ₹{service.defaultPrice}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingService(service.id);
                              setNewPrice(service.currentPrice);
                            }}
                          >
                            Edit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
