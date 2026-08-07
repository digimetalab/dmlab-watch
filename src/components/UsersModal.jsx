import { useEffect, useState } from "react";
import { X, RefreshCw, Trash2, ShieldCheck, User as UserIcon } from "lucide-react";
import { getUsers, setUserRole, resetUserPassword, deleteUser } from "../lib/api.js";
import { toast } from "../lib/toast.jsx";

export default function UsersModal({ selfId, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const r = await getUsers();
      setUsers(r.data);
    } catch (e) {
      toast(`Gagal memuat pengguna: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      await fn();
      toast(okMsg, "success");
      await load();
    } catch (e) {
      toast(`Gagal: ${e.message}`, "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggleRole = (u) =>
    run(u.id, () => setUserRole(u.id, u.role === "admin" ? "user" : "admin"), "Role diperbarui.");

  const doReset = (u) => {
    const pw = window.prompt(`Password baru untuk ${u.name || u.email}:`, "");
    if (pw && pw.trim()) run(u.id, () => resetUserPassword(u.id, pw.trim()), "Password di-reset.");
  };

  const doDelete = (u) => {
    if (u.id === selfId) {
      toast("Tidak bisa menghapus akun sendiri.", "error");
      return;
    }
    if (window.confirm(`Hapus pengguna "${u.name || u.email}"? Layout-nya ikut terhapus.`))
      run(u.id, () => deleteUser(u.id), "Pengguna dihapus.");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-semibold">Management Pengguna</h2>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Memuat...</div>}
          {!loading &&
            users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/5">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-800" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate flex items-center gap-1.5">
                    {u.name || u.email}
                    {u.id === selfId && <span className="text-xs text-gray-400 dark:text-gray-500">(kamu)</span>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {u.email || "tanpa email"} · {u.google ? "Google" : "Email"} · dibuat {new Date(u.created_at).toLocaleDateString("id-ID")}
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${u.role === "admin" ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}>
                  {u.role === "admin" ? "Admin" : "User"}
                </span>

                <button
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-40"
                  onClick={() => toggleRole(u)}
                  disabled={busyId === u.id}
                  title={u.role === "admin" ? "Jadikan User" : "Jadikan Admin"}
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-40"
                  onClick={() => doReset(u)}
                  disabled={busyId === u.id}
                  title="Reset password"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 dark:text-red-400 disabled:opacity-40"
                  onClick={() => doDelete(u)}
                  disabled={busyId === u.id}
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
