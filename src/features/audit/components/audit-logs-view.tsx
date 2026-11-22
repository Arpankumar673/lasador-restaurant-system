"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FileText,
  Search,
  Filter,
  Shield,
  User,
  Clock,
  Eye,
  X,
  Copy,
  Check,
  ChevronRight,
  Activity,
  Layers,
} from "lucide-react";

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditLogsViewProps {
  initialLogs: AuditLogEntry[];
}

export function AuditLogsView({ initialLogs }: AuditLogsViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState<string>("all");
  const [selectedLog, setSelectedLog] = React.useState<AuditLogEntry | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Filter logs based on search query and entity category
  const filteredLogs = React.useMemo(() => {
    return initialLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.entity.toLowerCase().includes(q) ||
        (log.entity_id && log.entity_id.toLowerCase().includes(q)) ||
        (log.actor?.full_name && log.actor.full_name.toLowerCase().includes(q)) ||
        (log.actor?.email && log.actor.email.toLowerCase().includes(q)) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(q));

      const matchesEntity =
        entityFilter === "all" ||
        log.entity.toLowerCase() === entityFilter.toLowerCase() ||
        (entityFilter === "auth" && log.action.startsWith("auth:")) ||
        (entityFilter === "staff" && log.action.startsWith("staff:"));

      return matchesSearch && matchesEntity;
    });
  }, [initialLogs, searchQuery, entityFilter]);

  const copyDetailsJson = () => {
    if (!selectedLog?.details) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatISTDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("create") || action.includes("login") || action.includes("provision")) {
      return "hops" as const;
    }
    if (action.includes("update") || action.includes("edit") || action.includes("reset")) {
      return "copper" as const;
    }
    if (action.includes("delete") || action.includes("deactivate") || action.includes("revoke")) {
      return "default" as const;
    }
    return "secondary" as const;
  };

  // Unique entity categories for quick filter buttons
  const uniqueEntities = React.useMemo(() => {
    const set = new Set<string>();
    initialLogs.forEach((l) => set.add(l.entity));
    return Array.from(set);
  }, [initialLogs]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-asador-border">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-asador-parchment">
            Audit Trail
          </h1>
          <p className="text-sm text-asador-silver mt-1">
            Immutable chronological record of administrative and security events for L&apos;Asador.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs border-asador-border bg-asador-deep text-asador-parchment">
            <Activity className="mr-1.5 h-3.5 w-3.5 text-asador-ember" />
            {initialLogs.length} Total Events Recorded
          </Badge>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider text-asador-silver">
              Total Log Entries
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-asador-parchment">
              {initialLogs.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-asador-silver flex items-center">
            <Layers className="h-3.5 w-3.5 mr-1 text-asador-copper" />
            Persistent PostgreSQL audit table
          </CardContent>
        </Card>

        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider text-asador-silver">
              Filtered Events
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-asador-ember">
              {filteredLogs.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-asador-silver flex items-center">
            <Filter className="h-3.5 w-3.5 mr-1 text-asador-ember" />
            Matching current query and filters
          </CardContent>
        </Card>

        <Card className="border-asador-border bg-asador-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider text-asador-silver">
              Security Standard
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-[#5dd974]">
              Sanitized
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-asador-silver flex items-center">
            <Shield className="h-3.5 w-3.5 mr-1 text-[#5dd974]" />
            Passwords and tokens redacted automatically
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-asador-border bg-asador-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-asador-silver" />
              <Input
                placeholder="Search by action, entity, actor email, or entity ID..."
                className="pl-9 bg-asador-deep border-asador-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-asador-silver font-medium mr-1 flex items-center">
                <Filter className="h-3 w-3 mr-1" /> Scope:
              </span>
              <Button
                variant={entityFilter === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setEntityFilter("all")}
              >
                All
              </Button>
              <Button
                variant={entityFilter === "auth" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setEntityFilter("auth")}
              >
                Auth
              </Button>
              <Button
                variant={entityFilter === "staff" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setEntityFilter("staff")}
              >
                Staff
              </Button>
              {uniqueEntities.map((ent) => (
                <Button
                  key={ent}
                  variant={entityFilter === ent ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8 capitalize"
                  onClick={() => setEntityFilter(ent)}
                >
                  {ent.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-asador-border bg-asador-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-asador-deep border-b border-asador-border text-xs uppercase tracking-wider text-asador-silver font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP / Source</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-asador-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-asador-silver">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-asador-parchment">No audit log entries found</p>
                    <p className="text-xs mt-1">
                      {searchQuery || entityFilter !== "all"
                        ? "Try adjusting your search criteria or filter scope."
                        : "Audit events will appear here as administrative actions occur."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-asador-surface/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3.5 px-4 text-xs font-mono text-asador-parchment whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-asador-silver" />
                        <span>{formatISTDate(log.created_at)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={getActionBadgeVariant(log.action)} className="font-mono text-[11px]">
                        {log.action}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-asador-silver">
                      <span className="text-asador-parchment font-semibold">{log.entity}</span>
                      {log.entity_id && (
                        <span className="text-[11px] block text-asador-silver truncate max-w-[120px]">
                          ID: {log.entity_id}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {log.actor ? (
                        <div>
                          <span className="font-medium text-asador-parchment block">
                            {log.actor.full_name}
                          </span>
                          <span className="text-[11px] text-asador-silver block truncate max-w-[160px]">
                            {log.actor.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-asador-silver flex items-center">
                          <Shield className="h-3 w-3 mr-1 text-asador-copper" />
                          System / Service
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-asador-silver">
                      {log.ip_address || "Internal"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-asador-silver hover:text-asador-parchment"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-asador-copper" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Slide-Over / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-asador border border-asador-border bg-asador-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-asador-border px-6 py-4 bg-asador-deep">
              <div>
                <h3 className="font-serif text-lg font-bold text-asador-parchment flex items-center space-x-2">
                  <span>Audit Event Inspection</span>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)} className="font-mono text-xs">
                    {selectedLog.action}
                  </Badge>
                </h3>
                <p className="text-xs text-asador-silver font-mono mt-0.5">
                  ID: {selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-asador p-1 text-asador-silver hover:text-asador-parchment hover:bg-asador-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-asador-silver uppercase tracking-wider font-semibold">Timestamp (IST)</span>
                  <p className="font-mono text-asador-parchment">{formatISTDate(selectedLog.created_at)}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-asador-silver uppercase tracking-wider font-semibold">Entity Target</span>
                  <p className="font-mono text-asador-parchment">
                    {selectedLog.entity} {selectedLog.entity_id ? `(#${selectedLog.entity_id})` : ""}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-asador-silver uppercase tracking-wider font-semibold">Actor</span>
                  <p className="text-asador-parchment">
                    {selectedLog.actor ? `${selectedLog.actor.full_name} (${selectedLog.actor.email})` : "System / Background Worker"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-asador-silver uppercase tracking-wider font-semibold">Source IP</span>
                  <p className="font-mono text-asador-parchment">{selectedLog.ip_address || "Internal Session"}</p>
                </div>
              </div>

              {/* JSON Details */}
              <div className="space-y-2 pt-2 border-t border-asador-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-asador-silver">
                    Event Payload / Metadata (Sanitized)
                  </span>
                  {selectedLog.details && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-asador-silver hover:text-asador-parchment"
                      onClick={copyDetailsJson}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1 text-[#5dd974]" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy JSON
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="rounded-asador border border-asador-border bg-asador-deep p-4 font-mono text-xs text-asador-parchment overflow-x-auto max-h-64">
                  {selectedLog.details ? (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-asador-silver italic">No metadata payload attached to this event.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-asador-border px-6 py-3 bg-asador-deep flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
