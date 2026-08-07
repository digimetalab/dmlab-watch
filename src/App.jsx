import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCameras,
  getLayouts,
  getHealth,
  getMe,
  getToken,
  setToken,
  logout as apiLogout,
  createLayout,
  updateLayout,
  deleteLayout,
  scrapeNow,
} from "./lib/api.js";
import { useProbe } from "./lib/useProbe.js";
import Grid from "./components/Grid.jsx";
import Toolbar from "./components/Toolbar.jsx";
import CameraPicker from "./components/CameraPicker.jsx";
import Login from "./components/Login.jsx";
import ToastContainer from "./lib/toast.jsx";
import { log } from "./lib/logger.js";

const LS_AUTOPLAY = "dml_autoplay";
const EMPTY_CELLS = [null, null, null, null, null, null, null, null, null];

export default function App() {
  const [cameras, setCameras] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [activeLayout, setActiveLayout] = useState(null);
  const [cells, setCells] = useState(EMPTY_CELLS);
  const [pickerCell, setPickerCell] = useState(null);
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem(LS_AUTOPLAY) !== "0");
  const [theme, setTheme] = useState(() => localStorage.getItem("dml_theme") || "dark");
  const [probeInterval, setProbeInterval] = useState(60000);
  const [bootError, setBootError] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const busyRef = useRef(false);

  const LS_ACTIVE = user ? `dml_active_layout_${user.username}` : "dml_active_layout";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("dml_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      log("info", "theme", `switched to ${next}`);
      return next;
    });
  };

  const cameraMap = useMemo(() => {
    const m = {};
    for (const c of cameras) m[c.id] = c;
    return m;
  }, [cameras]);

  const { statuses, playing, retry, togglePlay } = useProbe(cells, cameraMap, probeInterval);

  // ---- auth check on boot ----
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        setAuthReady(true);
        return;
      }
      try {
        const r = await getMe();
        setUser(r.user);
        log("info", "auth", `session restored ${r.user.username}`);
      } catch {
        setToken(null);
      }
      setAuthReady(true);
    })();
  }, []);

  // ---- load data once authenticated ----
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [camR, layR, health] = await Promise.all([getCameras(), getLayouts(), getHealth()]);
        setProbeInterval(Number(health.probeIntervalMs) || 60000);
        setCameras(camR.data);
        setLayouts(layR.data);
        const saved = Number(localStorage.getItem(LS_ACTIVE));
        let active =
          layR.data.find((l) => l.id === saved) ||
          layR.data.find((l) => l.is_default) ||
          layR.data[0];
        if (!active) return;
        let c = active.cells;
        if (!c.length) {
          c = camR.data
            .filter((x) => x.is_active)
            .slice(0, 9)
            .map((x) => x.id);
          try {
            await updateLayout(active.id, { cells: c });
          } catch {}
        }
        setActiveLayout(active);
        setCells(padCells(c));
        localStorage.setItem(LS_ACTIVE, String(active.id));
        log("info", "app boot", `loaded ${camR.data.length} cameras, active layout #${active.id} "${active.name}"`);
      } catch (e) {
        setBootError(e.message);
        log("error", "app boot", `failed: ${e.message}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, LS_ACTIVE]);

  const handleLogin = (token, u) => {
    setToken(token);
    setUser(u);
    setBootError(null);
    log("info", "auth", `login ${u.username}`);
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {}
    setToken(null);
    setUser(null);
    setLayouts([]);
    setActiveLayout(null);
    setCells(EMPTY_CELLS);
    setCameras([]);
    log("info", "auth", "logout");
  };

  const padCells = (arr) => {
    const c = Array.isArray(arr) ? arr.slice(0, 9) : [];
    return EMPTY_CELLS.map((_, i) => c[i] ?? null);
  };

  // ---- profile switching ----
  const selectLayout = async (id) => {
    const layout = layouts.find((l) => l.id === id);
    if (!layout || layout.id === activeLayout?.id) return;
    let c = layout.cells;
    if (!c.length) {
      c = cameras
        .filter((x) => x.is_active)
        .slice(0, 9)
        .map((x) => x.id);
      try {
        await updateLayout(layout.id, { cells: c });
      } catch {}
    }
    setActiveLayout(layout);
    setCells(padCells(c));
    localStorage.setItem(LS_ACTIVE, String(layout.id));
    log("info", "layout", `switch to #${layout.id} "${layout.name}"`);
  };

  // ---- cell editing ----
  const assignCell = async (index, camId) => {
    const next = [...cells];
    next[index] = camId;
    setCells(next);
    log("info", "cell", `cell #${index + 1} set to camera ${camId ?? "null"}`);
    if (activeLayout) {
      try {
        await updateLayout(activeLayout.id, { cells: next.map((x) => x ?? null) });
      } catch {}
    }
  };

  const createProfile = async (name) => {
    const created = await createLayout(name, cells.map((x) => x ?? null));
    const layR = await getLayouts();
    setLayouts(layR.data);
    setActiveLayout(created);
    localStorage.setItem(LS_ACTIVE, String(created.id));
    return { msg: `Profil "${name}" dibuat.` };
  };

  const renameProfile = async (id, name) => {
    await updateLayout(id, { name });
    const layR = await getLayouts();
    setLayouts(layR.data);
    return { msg: "Nama profil diperbarui." };
  };

  const removeProfile = async (id) => {
    await deleteLayout(id);
    const layR = await getLayouts();
    setLayouts(layR.data);
    const next =
      layR.data.find((l) => l.id === activeLayout?.id) ||
      layR.data.find((l) => l.is_default) ||
      layR.data[0];
    if (next) {
      setActiveLayout(next);
      setCells(padCells(next.cells));
      localStorage.setItem(LS_ACTIVE, String(next.id));
    }
    return { msg: "Profil dihapus." };
  };

  const refreshData = async () => {
    const r = await scrapeNow();
    const camR = await getCameras();
    setCameras(camR.data);
    return { msg: `Data diperbarui: ${r.total} kamera disinkronkan.` };
  };

  const toggleAutoplay = () => {
    setAutoplay((v) => {
      const next = !v;
      localStorage.setItem(LS_AUTOPLAY, next ? "1" : "0");
      log("info", "autoplay", `turned ${next ? "on" : "off"}`);
      return next;
    });
  };

  if (!authReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-[#0b0f17]">
        <div className="w-10 h-10 border-4 border-gray-300 dark:border-white/15 border-t-gray-700 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login theme={theme} onToggleTheme={toggleTheme} onLogin={handleLogin} />;
  }

  if (bootError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100 dark:bg-[#0b0f17] text-gray-900 dark:text-gray-200">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="font-semibold mb-1">Gagal memuat data CCTV</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">{bootError}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Pastikan server API berjalan: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">npm run dev</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gray-100 dark:bg-[#0b0f17] text-gray-900 dark:text-gray-200">
      <Toolbar
        layouts={layouts}
        activeId={activeLayout?.id ?? null}
        activeName={activeLayout?.name ?? ""}
        cameraCount={cameras.length}
        autoplay={autoplay}
        theme={theme}
        user={user}
        onSelectLayout={selectLayout}
        onCreateLayout={createProfile}
        onRenameLayout={renameProfile}
        onDeleteLayout={removeProfile}
        onScrape={refreshData}
        onToggleAutoplay={toggleAutoplay}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-h-0 p-2 max-w-[1920px] w-full mx-auto">
        <Grid
          cells={cells}
          cameraMap={cameraMap}
          statuses={statuses}
          playing={playing}
          autoplay={autoplay}
          suspended={!!fullscreenCam}
          onPickCell={(i) => {
            log("info", "cell", `open picker for cell #${i + 1}`);
            setPickerCell(i);
          }}
          onRetry={retry}
          onPlay={togglePlay}
          onFullscreen={(i) => {
            log("info", "fullscreen", `open camera #${cells[i]}`);
            setFullscreenCam(cameraMap[cells[i]]);
          }}
        />
      </main>

      {pickerCell !== null && (
        <CameraPicker
          activeCamId={cells[pickerCell]}
          usedIds={cells}
          onClose={() => setPickerCell(null)}
          onSelect={(camId) => {
            assignCell(pickerCell, camId);
            setPickerCell(null);
          }}
        />
      )}

      {fullscreenCam && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setFullscreenCam(null)}
        >
          <iframe
            src={`${fullscreenCam.url_proxy_hls.trim()}${
              fullscreenCam.url_proxy_hls.includes("?") ? "&" : "?"
            }controls=0&muted=1&autoplay=1&playsinline=1`}
            title={`Live ${fullscreenCam.nama_alias || fullscreenCam.nama_lokasi}`}
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            className="w-screen h-screen"
          />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded bg-black/70 text-white text-sm">
              {fullscreenCam.nama_alias || fullscreenCam.nama_device || fullscreenCam.nama_lokasi}
            </span>
            <button
              className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-sm"
              onClick={() => setFullscreenCam(null)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
