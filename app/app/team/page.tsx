"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { Loader2, UsersRound, Plus, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { planAtLeast } from "@/lib/plan-features";

interface Member {
  user_id: string;
  email: string;
  role: string;
}

export default function AppTeamPage() {
  const { clinic, user } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [limit, setLimit] = useState<number | null>(1);
  const [currentUserRole, setCurrentUserRole] = useState<string>("staff");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("staff");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const fetchTeam = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch("/api/app/team", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMembers(data.members ?? []);
      setLimit(data.limit ?? 1);
      setCurrentUserRole((data.currentUserRole as string) ?? "staff");
      setError(null);
    } else {
      setError((data.error as string) || "Failed to load team");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchTeam();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchTeam]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim() || !addPassword) return;
    setAdding(true);
    setAddError(null);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setAddError("Please sign in again.");
      setAdding(false);
      return;
    }
    const res = await fetch("/api/app/team", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: addEmail.trim(), password: addPassword, role: addRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAddEmail("");
      setAddPassword("");
      setAddRole("staff");
      await fetchTeam();
    } else {
      setAddError((data.error as string) || "Failed to add staff");
    }
    setAdding(false);
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm("Remove this staff member from the clinic? They will no longer have access.")) return;
    setRemovingId(userId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setRemovingId(null);
      return;
    }
    const res = await fetch(`/api/app/team/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) await fetchTeam();
    setRemovingId(null);
  };

  const handleEditStaff = async (userId: string, currentEmail: string) => {
    if (!editRole.trim()) return;
    if (editPassword && editPassword.length < 6) return;
    setSavingRole(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setSavingRole(false);
      setEditingId(null);
      return;
    }
    const payload: { role: string; email?: string; password?: string } = { role: editRole.trim() };
    if (editEmail.trim() && editEmail.trim().toLowerCase() !== currentEmail.toLowerCase()) {
      payload.email = editEmail.trim().toLowerCase();
    }
    if (editPassword.trim()) payload.password = editPassword;
    const res = await fetch(`/api/app/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await fetchTeam();
      setEditingId(null);
      setEditPassword("");
    } else {
      setError((data.error as string) || "Failed to update");
    }
    setSavingRole(false);
  };

  if (!clinic) return null;

  const canAccess = planAtLeast(clinic.plan, "pro");
  if (!canAccess) {
    return (
      <div className="responsive-stack space-y-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Team</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">
            Team and staff accounts are available on Pro and Elite plans. Upgrade your plan to invite more staff.
          </p>
          <Link
            href="/app/plan"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const limitLabel = limit === null ? "Unlimited" : String(limit);
  const staffMembers = members.filter((m) => m.role !== "owner");
  const atLimit = limit !== null && staffMembers.length >= limit;
  const currentUserId = user?.id ?? null;
  const isOwner = currentUserRole === "owner";

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Team</h1>
        <p className="mt-1 text-sm text-slate-600">
          Staff accounts with access to this clinic. Your plan includes up to {limitLabel} staff account{limit === 1 ? "" : "s"}.
          Staff can sign in on this site with their email and password to access the dashboard.
        </p>
      </div>

      {!atLimit && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add staff</h2>
          <p className="mt-0.5 text-sm text-slate-600">Create an account for a staff member. They will use this email and password to log in.</p>
          <form onSubmit={handleAddStaff} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="team-email" className="block text-xs font-medium text-slate-600">Email</label>
              <input
                id="team-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="staff@clinic.com"
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="team-password" className="block text-xs font-medium text-slate-600">Password</label>
              <input
                id="team-password"
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="team-role" className="block text-xs font-medium text-slate-600">Role</label>
              <select
                id="team-role"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="mt-0.5 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </form>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UsersRound className="h-5 w-5 text-primary" />
            Staff accounts ({staffMembers.length} of {limitLabel})
          </h2>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        <ul className="mt-4 space-y-3">
          {members.length === 0 ? (
            <li className="text-sm text-slate-500">No staff yet. Add someone above.</li>
          ) : (
            members.map((m) => (
              <li
                key={m.user_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">{m.email}</span>
                  {editingId === m.user_id ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        >
                          <option value="staff">Staff</option>
                          <option value="owner">Owner</option>
                        </select>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm min-w-[180px]"
                        />
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="New password (optional)"
                          minLength={6}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm min-w-[140px]"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditStaff(m.user_id, m.email)}
                          disabled={savingRole}
                          className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                          {savingRole ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingId(null); setEditPassword(""); }}
                          className="rounded p-1 text-slate-500 hover:bg-slate-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="ml-2 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                      {m.role}
                    </span>
                  )}
                </div>
                {editingId !== m.user_id && isOwner && (
                  <div className="flex items-center gap-1">
                    {m.role !== "owner" && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setError(null); setEditingId(m.user_id); setEditRole(m.role); setEditEmail(m.email); setEditPassword(""); }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          aria-label="Edit role"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(m.user_id)}
                          disabled={m.user_id === currentUserId || removingId === m.user_id}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Remove"
                          title={m.user_id === currentUserId ? "You cannot remove yourself" : "Remove from team"}
                        >
                          {removingId === m.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
        {atLimit && (
          <p className="mt-4 text-sm text-slate-600">
            You&apos;ve reached your plan limit. Upgrade to add more staff accounts.
          </p>
        )}
      </div>
    </div>
  );
}
