import { useEffect, useMemo, useState } from "react";
import { Search, Camera, X } from "lucide-react";
import { getCameras, probeStreams } from "../lib/api.js";
import CameraPickerMap from "./CameraPickerMap.jsx";

export default function CameraPicker({ onClose, onSelect, activeCamId, usedIds }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveMap, setLiveMap] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const r = await getCameras(q);
        if (!alive) return;
        const active = r.data.filter((c) => c.is_active);
        setItems(active);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }, q ? 300 : 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  // Probe live/offline status for all cameras (batched; server caches 60s)
  useEffect(() => {
    let alive = true;
    const unprobed = items.filter((c) => c.url_proxy_hls && liveMap[c.id] === undefined);
    if (!unprobed.length) return;
    (async () => {
      try {
        const r = await probeStreams(unprobed.map((c) => c.url_proxy_hls));
        if (!alive) return;
        const byUrl = {};
        for (const item of r.results) byUrl[item.url] = item.status;
        setLiveMap((m) => {
          const next = { ...m };
          for (const c of unprobed) next[c.id] = byUrl[c.url_proxy_hls] || "offline";
          return next;
        });
      } catch {
        if (alive)
          setLiveMap((m) => {
            const next = { ...m };
            for (const c of unprobed) next[c.id] = "offline";
            return next;
          });
      }
    })();
    return () => {
      alive = false;
    };
  }, [items, liveMap]);

  const dot = useMemo(
    () => ({
      online: "bg-green-500",
      offline: "bg-yellow-500",
    }),
    []
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-6xl h-[80vh] flex flex-col rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-semibold">Pilih Kamera</h2>
          <button
            className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 text-sm flex items-center gap-1"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            Tutup
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Left: search + list */}
          <div className="w-[38%] flex flex-col min-h-0 border-r border-gray-200 dark:border-white/10">
            <div className="px-3 py-3 border-b border-gray-200 dark:border-white/10 relative shrink-0">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari lokasi / kamera..."
                className="w-full pl-9 pr-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-white/10 focus:outline-none focus:border-gray-500 dark:focus:border-white/40 text-sm text-gray-900 dark:text-gray-200"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {error && <div className="p-4 text-sm text-red-600 dark:text-red-400">{error}</div>}
              {loading && (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Memuat daftar kamera...</div>
              )}
              {!loading && items.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Tidak ada kamera ditemukan.</div>
              )}
              {!loading &&
                items.map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-left border-b border-gray-100 dark:border-white/5"
                    onClick={() => onSelect(c.id)}
                  >
                    {c.poster_url ? (
                      <img src={c.poster_url} alt="" className="w-14 h-10 rounded object-cover bg-gray-200 dark:bg-gray-800" />
                    ) : (
                      <div className="w-14 h-10 rounded bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {c.nama_alias || c.nama_device || c.nama_lokasi}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {c.nama_lokasi} — {c.ket_lokasi}
                      </div>
                    </div>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        liveMap[c.id] === "online"
                          ? dot.online
                          : liveMap[c.id] === "offline"
                            ? dot.offline
                            : "bg-gray-400 dark:bg-gray-600"
                      }`}
                      title={liveMap[c.id] === "online" ? "LIVE" : liveMap[c.id] === "offline" ? "Pemeliharaan" : "..."}
                    />
                  </button>
                ))}
            </div>
          </div>

          {/* Right: map */}
          <div className="flex-1 min-w-0">
            <CameraPickerMap
              items={items}
              liveMap={liveMap}
              usedIds={usedIds}
              activeCamId={activeCamId}
              onSelect={onSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
