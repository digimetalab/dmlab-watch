import { useEffect, useRef, useState } from "react";
import { probeStream } from "../lib/api.js";

const POLL_MS = 60_000;

export function useProbe(cells, cameraMap) {
  const [statuses, setStatuses] = useState({});
  const [playing, setPlaying] = useState({});
  const lastCells = useRef("");

  const probeOne = async (index, cam) => {
    if (!cam) return;
    // Only show "checking" when there is no prior status. During periodic
    // re-checks keep the old status so a live iframe is never unmounted.
    setStatuses((s) => (s[index] === undefined ? { ...s, [index]: "checking" } : s));
    try {
      const r = await probeStream(cam.url_proxy_hls);
      const st = r.status === "online" ? "online" : "offline";
      setStatuses((s) => ({ ...s, [index]: st }));
      if (st !== "online") setPlaying((p) => ({ ...p, [index]: false }));
    } catch {
      setStatuses((s) => ({ ...s, [index]: "offline" }));
      setPlaying((p) => ({ ...p, [index]: false }));
    }
  };

  const joined = cells.join(",");

  // Probe cells that are new to the layout (no prior status yet).
  useEffect(() => {
    const changed = joined !== lastCells.current;
    lastCells.current = joined;
    if (!changed) return;
    const unprobed = cells
      .map((id, i) => ({ i, cam: id ? cameraMap[id] : null }))
      .filter((x) => x.cam && statuses[x.i] === undefined);
    unprobed.forEach(({ i, cam }) => probeOne(i, cam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  // Periodic re-check. Never demotes a live cell to "checking", so the
  // iframe stays mounted and the stream does not reload/flash.
  useEffect(() => {
    const t = setInterval(() => {
      cells.forEach((id, i) => {
        const cam = id ? cameraMap[id] : null;
        if (cam) probeOne(i, cam);
      });
    }, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  const retry = (index) => {
    const cam = cells[index] ? cameraMap[cells[index]] : null;
    if (cam) {
      setStatuses((s) => ({ ...s, [index]: "checking" }));
      probeOne(index, cam);
    }
  };

  const togglePlay = (index) => setPlaying((p) => ({ ...p, [index]: !p[index] }));

  return { statuses, playing, retry, togglePlay };
}
