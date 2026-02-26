"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Loader2, Mail, Shield, ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    is_admin: false,
  });

  const load = useCallback(
    (p = page) => {
      setLoading(true);
      setError(null);
      adminFetch(`/users?page=${p}&limit=${PAGE_SIZE}`)
        .then((res: { users: UserRow[]; total: number }) => {
          setUsers(res.users ?? []);
          setTotal(res.total ?? 0);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Failed to load users");
          setUsers([]);
        })
        .finally(() => setLoading(false));
    },
    [page]
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: "", password: "", is_admin: false });
    setModal("create");
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({ email: u.email, password: "", is_admin: !!u.is_admin });
    setModal("edit");
  };

  const saveCreate = async () => {
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    if (!email || !password) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          is_admin: form.is_admin,
        }),
      });
      setModal(null);
      setEditing(null);
      setPage(1);
      load(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    setSaving(true);
    setError(null);
    try {
      const body: { email?: string; password?: string; is_admin?: boolean } = {
        email,
        is_admin: form.is_admin,
      };
      if (password) {
        body.password = password;
      }
      await adminFetch(`/users/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setModal(null);
      setEditing(null);
      load(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Delete user "${email}"? This will revoke their sessions.`)) return;
    setDeletingId(id);
    setError(null);
    try {
      await adminFetch(`/users/${id}`, {
        method: "DELETE",
      });
      load(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatDate = (s: string) => {
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage app users, admin access, and credentials.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Create user
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No users yet. Create one to get started.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Email</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Role</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Created</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Updated</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-700 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            u.is_admin
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                          )}
                        >
                          {u.is_admin ? (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          ) : (
                            <Shield className="h-3.5 w-3.5" />
                          )}
                          {u.is_admin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(u.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id, u.email)}
                            disabled={deletingId === u.id}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    page <= 1
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  )}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    page >= totalPages
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4"
          onClick={() => !saving && setModal(null)}
        >
          <div
            className="my-auto flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {modal === "create" ? "Create user" : "Edit user"}
            </h2>
            <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {modal === "create" ? "Password" : "New password (optional)"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder={modal === "create" ? "At least 8 characters" : "Leave blank to keep current password"}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-700/40">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Admin access</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Admins can access the full DentraFlow admin panel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_admin: !f.is_admin }))}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                    form.is_admin
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100"
                  )}
                >
                  {form.is_admin ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                  {form.is_admin ? "Admin" : "User"}
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !saving && setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={modal === "create" ? saveCreate : saveEdit}
                disabled={
                  saving ||
                  !form.email.trim() ||
                  (modal === "create" && !form.password.trim())
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : modal === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

