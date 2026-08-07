import { useState } from "react";
import { TriangleAlert, RefreshCw, Play, Maximize } from "lucide-react";

const STATUS_LABEL = {
  checking: "CHECKING",
  online: "READY",
  live: "LIVE",
  offline: "MAINTENANCE",
};

const STATUS_BADGE = {
  checking: "bg-gray-600 text-white",
  online: "bg-green-500 text-white",
  live: "bg-red-500 text-white",
  offline: "bg-yellow-500 text-black",
};

// Remote player page supports these query params (muted/autoplay default to 1).
// controls=0 hides the browser's native play button.
const STREAM_PARAMS = "?controls=0&muted=1&autoplay=1&playsinline=1";

function streamSrc(url) {
  const u = (url || "").trim();
  if (!u) return null;
  return u.includes("?") ? `${u}&${STREAM_PARAMS.slice(1)}` : `${u}${STREAM_PARAMS}`;
}

export default function Cell({ index, cam, status, playing, suspended, onPick, onRetry, onPlay, onFullscreen }) {
  const badge = status ? STATUS_LABEL[status] : "KOSONG";
  const [nonce, setNonce] = useState(0);

  const reload = (e) => {
    e.stopPropagation();
    setNonce((n) => n + 1);
  };

  const iframeSrc = cam ? streamSrc(cam.url_proxy_hls) : null;
  const keyedSrc = iframeSrc && nonce > 0 ? `${iframeSrc}&_r=${nonce}` : iframeSrc;

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-gray-300 dark:border-white/10 bg-gray-200 dark:bg-gray-900 group cursor-pointer aspect-video lg:aspect-auto lg:h-full"
      onClick={onPick}
    >
      {!cam && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
          <div className="text-3xl font-bold text-gray-300 dark:text-gray-700">+</div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Pilih Kamera</span>
        </div>
      )}

      {cam && status === "checking" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-800">
          <div className="w-12 h-12 border-4 border-white/15 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-gray-300">Memeriksa kamera...</span>
        </div>
      )}

      {cam && status === "online" && !playing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-cover bg-center"
          style={cam.poster_url ? { backgroundImage: `url(${cam.poster_url})` } : undefined}>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700 opacity-80" />
          <span className="relative z-10 text-sm text-white font-medium">Klik play untuk streaming</span>
          <button
            className="relative z-10 mt-3 min-h-[44px] px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium inline-flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            <Play className="w-4 h-4" />
            Play
          </button>
        </div>
      )}

      {cam && status === "online" && playing && (
        <iframe
          src={keyedSrc}
          title={`Live ${cam.nama_alias || cam.nama_lokasi}`}
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          className="absolute inset-0 w-full h-full iframe-video"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* While fullscreen is open, cells are suspended (no video) to free resources */}
      {cam && status === "online" && suspended && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <span className="text-xs text-gray-500">Dihentikan saat layar penuh</span>
        </div>
      )}

      {cam && status === "offline" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-800 text-center p-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <TriangleAlert className="w-5 h-5 text-yellow-500" />
          </div>
          <span className="text-sm text-white">Kamera tidak dapat diakses</span>
          <span className="text-xs text-gray-400">Mungkin sedang pemeliharaan</span>
          <button
            className="mt-1 min-h-[44px] px-3 py-1.5 rounded-md border border-white/20 text-xs text-white hover:bg-white/10 inline-flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* status badge */}
      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[status] || "bg-gray-700 text-gray-300"}`}>
        {badge}
      </span>

      {/* camera name */}
      {cam && (
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <span className="px-2 py-0.5 rounded bg-black/60 text-white text-xs truncate">
            {cam.nama_alias || cam.nama_device || cam.nama_lokasi}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/50 text-gray-300 text-[11px]">
            #{index + 1}
          </span>
        </div>
      )}

      {/* hover actions */}
      {cam && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onPick();
            }}
          >
            Ganti
          </button>
          {status === "online" && (
            <button
              className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1"
              onClick={reload}
              title="Muat ulang stream"
            >
              <RefreshCw className="w-3 h-3" />
              Muat Ulang
            </button>
          )}
          <button
            className="min-h-[40px] px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs inline-flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onFullscreen();
            }}
          >
            <Maximize className="w-3.5 h-3.5" />
            Perbesar
          </button>
        </div>
      )}
    </div>
  );
}
