"use client";

import { Appbar } from "@/components/Appbar";
import { BACKEND_URL } from "@/app/config";
import axios from "axios";
import { useEffect, useState } from "react";

interface ZapRunLog {
    id: string;
    stage: number;
    actionId: string;
    status: "SUCCESS" | "FAILED";
    error: string | null;
    executedAt: string;
}

interface ZapRun {
    id: string;
    metadata: Record<string, unknown>;
    logs: ZapRunLog[];
}

function useZapRuns(zapId: string) {
    const [runs, setRuns] = useState<ZapRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        axios.get(`${BACKEND_URL}/api/v1/zap/${zapId}/runs`, {
            headers: { Authorization: localStorage.getItem("token") }
        })
            .then(res => {
                setRuns(res.data.runs);
                setLoading(false);
            })
            .catch(() => {
                setError("Failed to load run history");
                setLoading(false);
            });
    }, [zapId]);

    return { runs, loading, error };
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function StatusBadge({ status }: { status: "SUCCESS" | "FAILED" }) {
    const base = "inline-block px-2 py-0.5 rounded text-xs font-semibold";
    return status === "SUCCESS"
        ? <span className={`${base} bg-green-100 text-green-700`}>SUCCESS</span>
        : <span className={`${base} bg-red-100 text-red-700`}>FAILED</span>;
}

function RunRow({ run }: { run: ZapRun }) {
    const [expanded, setExpanded] = useState(false);
    const overallStatus = run.logs.every(l => l.status === "SUCCESS") ? "SUCCESS" : "FAILED";

    return (
        <div className="border rounded-lg mb-3 overflow-hidden">
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-3">
                    <StatusBadge status={overallStatus} />
                    <span className="text-sm font-mono text-slate-500">{run.id}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">
                        {run.logs.length} action{run.logs.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-slate-400">{expanded ? "▲" : "▼"}</span>
                </div>
            </div>

            {expanded && (
                <div className="border-t bg-slate-50 px-4 py-3">
                    {run.logs.length === 0 ? (
                        <p className="text-sm text-slate-400">No action logs recorded for this run.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b">
                                    <th className="pb-2 pr-4">Stage</th>
                                    <th className="pb-2 pr-4">Action</th>
                                    <th className="pb-2 pr-4">Status</th>
                                    <th className="pb-2 pr-4">Executed At</th>
                                    <th className="pb-2">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {run.logs.map(log => (
                                    <tr key={log.id} className="border-b last:border-0">
                                        <td className="py-2 pr-4 text-slate-600">{log.stage}</td>
                                        <td className="py-2 pr-4 font-mono text-slate-700">{log.actionId}</td>
                                        <td className="py-2 pr-4"><StatusBadge status={log.status} /></td>
                                        <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{formatDate(log.executedAt)}</td>
                                        <td className="py-2 text-red-500 text-xs">{log.error ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ZapRunsPage({ params }: { params: { zapId: string } }) {
    const { runs, loading, error } = useZapRuns(params.zapId);

    return (
        <div>
            <Appbar />
            <div className="flex justify-center pt-8 px-4">
                <div className="w-full max-w-screen-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Run History</h1>
                            <p className="text-sm text-slate-500 mt-1 font-mono">{params.zapId}</p>
                        </div>
                        <a href="/dashboard" className="text-sm text-purple-700 hover:underline">
                            ← Back to Dashboard
                        </a>
                    </div>

                    {loading && (
                        <div className="text-slate-400 text-sm">Loading runs...</div>
                    )}

                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}

                    {!loading && !error && runs.length === 0 && (
                        <div className="text-center py-16 text-slate-400">
                            <div className="text-4xl mb-3">📭</div>
                            <p className="text-lg font-medium">No runs yet</p>
                            <p className="text-sm mt-1">Trigger your webhook to see execution history here.</p>
                        </div>
                    )}

                    {!loading && runs.map(run => (
                        <RunRow key={run.id} run={run} />
                    ))}
                </div>
            </div>
        </div>
    );
}
