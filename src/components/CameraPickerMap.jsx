import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DENPASAR = [-8.6727, 115.2243];

const CCTV_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97"/>
  <path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"/>
  <path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"/>
  <path d="M2 21v-4"/>
  <path d="M7 9h.01"/>
</svg>`;

// Priority: active cell > used in 3x3 layout > live/dead/unknown
function markerState(id, liveMap, usedSet, activeCamId) {
  if (id === activeCamId) return "active";
  if (usedSet.has(id)) return "layout";
  const st = liveMap[id];
  return st === "online" ? "live" : st === "offline" ? "dead" : "unknown";
}

function pinIcon(state) {
  return L.divIcon({
    className: "cctv-marker",
    html: `<div class="pin pin-${state}">${CCTV_SVG}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const LEGEND = [
  { cls: "live", label: "LIVE" },
  { cls: "dead", label: "Mati / Maintenance" },
  { cls: "layout", label: "Dipakai di layar 3×3" },
  { cls: "active", label: "Sel yang sedang diatur" },
];

export default function CameraPickerMap({ items, liveMap, usedIds, activeCamId, onSelect }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const fitted = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const usedSet = useMemo(() => new Set((usedIds || []).filter(Number.isInteger)), [usedIds]);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, {
      center: DENPASAR,
      zoom: 12,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      fitted.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const pts = items.filter(
      (c) => typeof c.lat === "number" && typeof c.lon === "number" && c.lat && c.lon
    );

    const markers = pts.map((c) => {
      const state = markerState(c.id, liveMap, usedSet, activeCamId);
      const m = L.marker([c.lat, c.lon], {
        icon: pinIcon(state),
        title: c.nama_alias || c.nama_device || c.nama_lokasi,
      });
      m.bindTooltip(c.nama_alias || c.nama_device || c.nama_lokasi, {
        direction: "top",
        offset: [0, -16],
      });
      m.on("click", () => onSelectRef.current(c.id));
      m.addTo(layer);
      return m;
    });

    if (markers.length && !fitted.current) {
      fitted.current = true;
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.12), { maxZoom: 14 });
    }
  }, [items, liveMap, usedSet, activeCamId]);

  return (
    <div className="relative h-full w-full">
      <div ref={divRef} className="h-full w-full" />
      <div className="absolute bottom-2 left-2 z-[500] px-2.5 py-2 rounded-md bg-gray-900/85 text-[11px] pointer-events-none space-y-1">
        {LEGEND.map((l) => (
          <div key={l.cls} className="flex items-center gap-2 text-gray-200">
            <span className={`w-3.5 h-3.5 rounded-[4px] border border-white/70 sw-${l.cls}`} />
            {l.label}
          </div>
        ))}
        <div className="pt-1 text-gray-400">Klik marker untuk memilih kamera</div>
      </div>
    </div>
  );
}
