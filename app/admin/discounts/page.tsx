"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { QuotaCard } from "@/components/admin/quota-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuotaData {
  limit: number;
  used: number;
  remaining: number;
  date: string;
}

interface AuditLog {
  correlationId: string;
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
  actorId?: string;
}

export default function DiscountsPage() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch quota
      const quotaRes = await fetch("/api/admin/quota");
      if (!quotaRes.ok) {
        if (quotaRes.status === 401 || quotaRes.status === 403) {
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to fetch quota");
      }
      const quotaData = await quotaRes.json();
      setQuota(quotaData.quota);

      // Fetch admin action logs
      const logsRes = await fetch("/api/admin/logs?actorType=admin&limit=20");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuota = async (newLimit: number, reason?: string) => {
    const res = await fetch("/api/admin/quota", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: newLimit, reason }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update quota");
    }

    // Refresh data
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Discount Management</h1>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuotaCard
            quota={quota}
            loading={loading}
            onUpdate={handleUpdateQuota}
          />

          <Card>
            <CardHeader>
              <CardTitle>Business Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">
                  R1 - Discount Eligibility (12%)
                </h3>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• Female customer on birthday</li>
                  <li>• OR base price exceeds ₹1,000</li>
                </ul>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <h3 className="font-medium text-amber-900">R2 - Daily Quota</h3>
                <ul className="mt-2 text-sm text-amber-700 space-y-1">
                  <li>• System-wide limit per day</li>
                  <li>• Resets at midnight IST</li>
                  <li>• Rejected when exhausted</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Admin Actions Log</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No admin actions recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{log.event}</Badge>
                      <span className="text-slate-600">
                        {log.data ? JSON.stringify(log.data) : "No details"}
                      </span>
                    </div>
                    <span className="text-slate-400 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
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
