import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Check,
  RefreshCw,
  CirclePlay,
  CirclePause,
  Maximize,
  Minimize,
  Sun,
  Moon,
  LogOut,
  UserCircle,
} from "lucide-react";
import { toast } from "../lib/toast.jsx";

function IconButton({ icon, label, onClick, active, busy, disabled }) {
  return (
    <button
      className={`group/ib relative min-w-[40px] min-h-[40px] p-2 rounded-lg border inline-flex items-center justify-center transition-colors disabled:opacity-50 ${
        active
          ? "bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white border-gray-300 dark:border-white/25"
          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-transparent"
      }`}
      onClick={onClick}
      disabled={disabled || busy}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-950 border border-gray-300 dark:border-white/10 text-xs text-gray-700 dark:text-gray-200 opacity-0 group-hover/ib:opacity-100 transition-opacity">
        {label}
      </span>
    </button>
  );
}

function MenuRow({ icon, label, onClick, danger }) {
  return (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
        danger ? "text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40" : "text-gray-700 dark:text-gray-200"
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

export default function Toolbar({
  layouts,
  activeId,
  activeName,
  cameraCount,
  autoplay,
  theme,
  user,
  onSelectLayout,
  onCreateLayout,
  onRenameLayout,
  onDeleteLayout,
  onScrape,
  onToggleAutoplay,
  onToggleTheme,
  onLogout,
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [fs, setFs] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      toast(okMsg || r?.msg || "Selesai.", "success");
    } catch (e) {
      toast(`Gagal: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const promptNew = () => {
    setOpen(false);
    const name = window.prompt("Nama profil layout baru:");
    if (name && name.trim()) run(() => onCreateLayout(name.trim()), `Profil "${name.trim()}" dibuat.`);
  };

  const promptRename = () => {
    setOpen(false);
    const name = window.prompt("Nama baru:", activeName);
    if (name && name.trim() && name.trim() !== activeName)
      run(() => onRenameLayout(activeId, name.trim()), "Nama profil diperbarui.");
  };

  const confirmDelete = () => {
    setOpen(false);
    if (layouts.length <= 1) {
      toast("Tidak bisa menghapus profil terakhir.", "error");
      return;
    }
    if (window.confirm(`Hapus profil "${activeName}"?`))
      run(() => onDeleteLayout(activeId), "Profil dihapus.");
  };

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  return (
    <header className="z-40 bg-white/90 backdrop-blur border-b border-gray-200 dark:bg-gray-950/90 dark:border-white/10 shrink-0">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 py-2 flex items-center gap-2 flex-wrap">
        <div className="mr-auto flex items-center gap-2 sm:gap-3 min-w-0">
          <img src="/favicon.svg" alt="DMLab Watch" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0" />
          <div className="leading-tight min-w-0">
            <h1 className="text-base font-bold truncate">DMLab Watch</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{cameraCount} CCTV terpasang</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5" ref={menuRef}>
          <div className="relative">
            <IconButton
              icon={<LayoutGrid className="w-5 h-5" />}
              label="Profil Layout"
              active={open}
              onClick={() => setOpen((o) => !o)}
            />

            {open && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl p-1.5 z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Profil Layout
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {layouts.map((l) => (
                    <button
                      key={l.id}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-left text-gray-700 dark:text-gray-200"
                      onClick={() => {
                        onSelectLayout(l.id);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{l.name}</span>
                      {l.id === activeId && <Check className="w-4 h-4 shrink-0 text-gray-900 dark:text-white" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-white/10 my-1.5" />
                <MenuRow icon={<Plus className="w-4 h-4" />} label="Profil Baru" onClick={promptNew} />
                <MenuRow icon={<Pencil className="w-4 h-4" />} label="Ganti Nama" onClick={promptRename} />
                <MenuRow
                  icon={<Trash2 className="w-4 h-4" />}
                  label="Hapus Profil"
                  onClick={confirmDelete}
                  danger
                />
              </div>
            )}
          </div>

          <IconButton
            icon={<RefreshCw className={`w-5 h-5 ${busy ? "animate-spin" : ""}`} />}
            label="Perbarui Data"
            onClick={() => run(() => onScrape(), "Data diperbarui.")}
          />

          <IconButton
            icon={
              autoplay ? (
                <CirclePause className="w-5 h-5" />
              ) : (
                <CirclePlay className="w-5 h-5" />
              )
            }
            label={autoplay ? "Autoplay: Nyala" : "Autoplay: Mati"}
            active={autoplay}
            onClick={onToggleAutoplay}
          />

          <IconButton
            icon={theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            label={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            onClick={onToggleTheme}
          />

          <IconButton
            icon={fs ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            label={fs ? "Keluar Layar Penuh" : "Layar Penuh"}
            onClick={toggleFs}
          />

          {user && (
            <div className="ml-1 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <UserCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium max-w-[10rem] truncate">{user.username}</span>
              <button
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                onClick={onLogout}
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
