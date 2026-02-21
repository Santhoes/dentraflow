"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Bot, Plus, Pencil, Trash2, Loader2, Copy, X } from "lucide-react";
import { getPlanLimit, formatPlanLimit } from "@/lib/plan-features";

interface Agent {
  id: string;
  name: string;
  location_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface LocationOption {
  id: string;
  name: string;
}

export default function AppAgentsPage() {
  const { clinic } = useApp();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [limit, setLimit] = useState<number | null>(1);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [modalOpen, setModalOpen] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch("/api/app/agents", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAgents(data.agents ?? []);
      setLimit(data.limit ?? 1);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    if (!clinic?.id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("clinic_locations")
      .select("id, name")
      .eq("clinic_id", clinic.id)
      .order("sort_order", { ascending: true });
    setLocations((data as LocationOption[]) ?? []);
  }, [clinic?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchAgents();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchAgents]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const atLimit = limit !== null && agents.length >= limit;
  const canAddMore = !atLimit;

  const openAdd = () => {
    setError(null);
    setName("");
    setLocationId("");
    setEditingId(null);
    setModalOpen("add");
  };

  const openEdit = (agent: Agent) => {
    setError(null);
    setName(agent.name);
    setLocationId(agent.location_id ?? "");
    setEditingId(agent.id);
    setModalOpen("edit");
  };

  const saveAgent = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      if (modalOpen === "add") {
        const res = await fetch("/api/app/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: trimmedName,
            location_id: locationId || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to create agent");
          return;
        }
        await fetchAgents();
        setModalOpen(null);
      } else if (editingId) {
        const res = await fetch(`/api/app/agents/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: trimmedName,
            location_id: locationId || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to update agent");
          return;
        }
        await fetchAgents();
        setModalOpen(null);
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async (id: string) => {
    if (!window.confirm("Remove this AI agent? The chat widget for this agent will stop working.")) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/app/agents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) await fetchAgents();
    } finally {
      setDeletingId(null);
    }
  };

  const copyEmbed = async (agentId: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    setCopyingId(agentId);
    try {
      const res = await fetch(`/api/app/embed-url?agent=${encodeURIComponent(agentId)}`, {
        headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json().catch(() => ({}));
      const snippet = data.iframeSnippet ?? data.embedUrl;
      if (snippet) await navigator.clipboard.writeText(snippet);
    } finally {
      setCopyingId(null);
    }
  };

  const getLocationName = (locId: string | null) => {
    if (!locId) return `${clinic?.name ?? "Clinic"} (main)`;
    const loc = locations.find((l) => l.id === locId);
    return loc?.name ?? "Branch";
  };

  if (!clinic) return null;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">AI Agents</h1>
        <p className="mt-1 text-slate-600">
          Give each receptionist a name. Each agent powers one chat widget. Your plan includes{" "}
          {formatPlanLimit(limit)} agent{limit === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-700">
            Agents: <span className="text-slate-900">{agents.length}</span>
            {limit !== null && (
              <span className="text-slate-500"> / {formatPlanLimit(limit)}</span>
            )}
          </p>
          {canAddMore ? (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add agent
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              Plan limit reached.{" "}
              <Link href="/app/plan" className="font-medium text-primary hover:underline">
                Upgrade
              </Link>
            </p>
          )}
        </div>

        {agents.length === 0 ? (
          <div className="mt-6 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <Bot className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-3 font-medium text-slate-700">No AI agents yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Add an agent with a name (e.g. Sarah, Alex). Each agent gets its own chat widget for your website.
            </p>
            {canAddMore && (
              <button
                type="button"
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add your first agent
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {agents.map((agent) => (
              <li
                key={agent.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{agent.name}</p>
                  <p className="text-xs text-slate-500">{getLocationName(agent.location_id)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyEmbed(agent.id)}
                    disabled={copyingId === agent.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {copyingId === agent.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                    Copy embed
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(agent)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAgent(agent.id)}
                    disabled={deletingId === agent.id}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label="Delete"
                  >
                    {deletingId === agent.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add/Edit modal */}
      {(modalOpen === "add" || modalOpen === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-4">
          <div className="my-auto w-full max-w-md shrink-0 rounded-xl border border-slate-200 bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {modalOpen === "add" ? "Add AI agent" : "Edit agent"}
              </h3>
              <button
                type="button"
                onClick={() => { setModalOpen(null); setError(null); }}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              <div>
                <label htmlFor="agent-name" className="block text-sm font-medium text-slate-700">
                  Name (e.g. Sarah, Alex) *
                </label>
                <input
                  id="agent-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Receptionist name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="agent-location" className="block text-sm font-medium text-slate-700">
                  Location (optional)
                </label>
                <select
                  id="agent-location"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{clinic.name} (main)</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <p className="mt-0.5 text-xs text-slate-500">
                  Link this agent to a branch so hours and insurance match that location.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-4 sm:px-6 py-4">
              <button
                type="button"
                onClick={() => { setModalOpen(null); setError(null); }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAgent}
                disabled={saving || !name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {modalOpen === "add" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
