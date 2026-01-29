"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AuditLog {
  _id: string;
  correlationId: string;
  event: string;
  service: string;
  status: string;
  timestamp: string;
  actorType: string;
  actorId?: string;
  actionSource: string;
  data?: Record<string, unknown>;
}

type FilterType = "all" | "admin" | "system";

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter !== "all") {
        params.set("actorType", filter);
      }

      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to fetch logs");
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError("Failed to load logs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failure":
        return "bg-red-100 text-red-800";
      case "compensation":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getActorBadge = (actorType: string) => {
    switch (actorType) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "user":
        return <Badge variant="secondary">User</Badge>;
      default:
        return <Badge variant="outline">System</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "admin" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("admin")}
            >
              Admin Only
            </Button>
            <Button
              variant={filter === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("system")}
            >
              System Only
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-slate-100 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-slate-500">No logs found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Time</th>
                      <th className="text-left py-3 px-2 font-medium">Event</th>
                      <th className="text-left py-3 px-2 font-medium">
                        Service
                      </th>
                      <th className="text-left py-3 px-2 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-2 font-medium">Actor</th>
                      <th className="text-left py-3 px-2 font-medium">
                        Correlation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-2 text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 font-medium">{log.event}</td>
                        <td className="py-3 px-2 text-slate-600">
                          {log.service}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusColor(log.status)}`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {getActorBadge(log.actorType)}
                        </td>
                        <td className="py-3 px-2">
                          <code className="text-xs text-slate-500">
                            {log.correlationId.slice(0, 8)}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
