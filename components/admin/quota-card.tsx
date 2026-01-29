"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuotaCardProps {
  quota: {
    limit: number;
    used: number;
    remaining: number;
    date: string;
  } | null;
  loading?: boolean;
  onUpdate: (newLimit: number, reason?: string) => Promise<void>;
}

export function QuotaCard({ quota, loading, onUpdate }: QuotaCardProps) {
  const [editing, setEditing] = useState(false);
  const [newLimit, setNewLimit] = useState(quota?.limit || 100);
  const [reason, setReason] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await onUpdate(newLimit, reason || undefined);
      setEditing(false);
      setReason("");
    } catch (error) {
      console.error("Failed to update quota:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-slate-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-slate-200 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Daily Discount Quota (R2)</span>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewLimit(quota?.limit || 100);
                setEditing(true);
              }}
            >
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="limit">New Daily Limit</Label>
              <Input
                id="limit"
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(parseInt(e.target.value) || 0)}
                min={0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Holiday promotion"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={updating}>
                {updating ? "Updating..." : "Update Quota"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={updating}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {quota?.limit || 0}
                </div>
                <div className="text-sm text-slate-500">Daily Limit</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {quota?.used || 0}
                </div>
                <div className="text-sm text-slate-500">Used Today</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {quota?.remaining || 0}
                </div>
                <div className="text-sm text-slate-500">Remaining</div>
              </div>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{
                  width: `${quota ? Math.min((quota.used / quota.limit) * 100, 100) : 0}%`,
                }}
              />
            </div>
            <p className="text-sm text-slate-500">
              Date: {quota?.date || "N/A"} (IST)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
