import { useRef, useState } from "react";
import { X, Camera, KeyRound } from "lucide-react";
import { updateProfile, changePassword } from "../lib/api.js";
import { toast } from "../lib/toast.jsx";

function fileToDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("gagal memuat gambar"));
    };
    img.src = url;
  });
}

export default function ProfileModal({ user, onClose, onUpdated }) {
  const [name, setName] = useState(user.name || "");
  const [avatar, setAvatar] = useState(user.avatar_url || null);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const saveProfile = async () => {
    setBusy(true);
    try {
      const patch = { name };
      if (avatar !== (user.avatar_url || null)) patch.avatar = avatar;
      const r = await updateProfile(patch);
      onUpdated(r.user);
      toast("Profil diperbarui.", "success");
    } catch (e) {
      toast(`Gagal: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setBusy(true);
    try {
      await changePassword(curPw, newPw);
      setCurPw("");
      setNewPw("");
      toast("Password diperbarui.", "success");
    } catch (e) {
      toast(`Gagal: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setAvatar(await fileToDataUrl(f));
    } catch {
      toast("Gagal memproses gambar.", "error");
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-white/10 focus:outline-none focus:border-gray-500 dark:focus:border-white/40 text-sm";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-semibold">Profil</h2>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="Foto profil" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-white/10" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <Camera className="w-9 h-9" />
                </div>
              )}
              <button
                className="absolute bottom-0 right-0 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white"
                onClick={() => fileRef.current?.click()}
                title="Ganti foto"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </div>
            {avatar && avatar !== user.avatar_url && (
              <button className="mt-2 text-xs text-gray-500 dark:text-gray-400 underline" onClick={() => setAvatar(user.avatar_url || null)}>
                Batalkan perubahan foto
              </button>
            )}
          </div>

          <label className="block text-sm font-medium mb-1.5">Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} mb-4`} />

          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input value={user.email || "-"} disabled className={`${inputCls} mb-4 opacity-60`} />

          <button
            onClick={saveProfile}
            disabled={busy}
            className="w-full min-h-[44px] rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-white dark:text-gray-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            Simpan Profil
          </button>

          <div className="my-5 border-t border-gray-200 dark:border-white/10" />

          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold">Ganti Password</h3>
          </div>

          <label className="block text-sm font-medium mb-1.5">Password saat ini</label>
          <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className={`${inputCls} mb-3`} autoComplete="current-password" />

          <label className="block text-sm font-medium mb-1.5">Password baru</label>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={`${inputCls} mb-4`} autoComplete="new-password" placeholder="minimal 6 karakter" />

          <button
            onClick={savePassword}
            disabled={busy || newPw.length < 6}
            className="w-full min-h-[44px] rounded-lg border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Perbarui Password
          </button>
        </div>
      </div>
    </div>
  );
}
