import { useEffect, useRef, useState } from "react";
import { probeStreams } from "../lib/api.js";

export function useProbe(cells, cameraMap, intervalMs = 60_000) {
  const [statuses, setStatuses] = useState({});
  const [playing, setPlaying] = useState({});
  const lastCells = useRef("");
  const busy = useRef(false);

  const pairsFor = (indexes) => {
    const pairs = [];
    for (const i of indexes) {
      const id = cells[i];
      const cam = id ? cameraMap[id] : null;
      if (cam) pairs.push([i, cam]);
    }
    return pairs;
  };

  const probeBatch = async (pairs) => {
    if (!pairs.length || busy.current) return;
    busy.current = true;
    const urls = [...new Set(pairs.map(([, cam]) => cam.url_proxy_hls))];
    try {
      const r = await probeStreams(urls);
      const byUrl = {};
      for (const item of r.results) byUrl[item.url] = item.status;
      setStatuses((s) => {
        const next = { ...s };
        for (const [i, cam] of pairs) {
          const st = byUrl[cam.url_proxy_hls] === "online" ? "online" : "offline";
          next[i] = st;
        }
        return next;
      });
      const offlineIdx = pairs
        .filter(([, cam]) => byUrl[cam.url_proxy_hls] !== "online")
        .map(([i]) => i);
      if (offlineIdx.length) {
        setPlaying((p) => {
          const n = { ...p };
          for (const i of offlineIdx) n[i] = false;
          return n;
        });
      }
    } catch {
      setStatuses((s) => {
        const next = { ...s };
        for (const [i] of pairs) next[i] = "offline";
        return next;
      });
    } finally {
      busy.current = false;
    }
  };

  // Probe cells that are new to the layout (no prior status yet).
  useEffect(() => {
    const joined = cells.join(",");
    const changed = joined !== lastCells.current;
    lastCells.current = joined;
    if (!changed) return;
    const newIndexes = [];
    cells.forEach((id, i) => {
      if (id && statuses[i] === undefined && cameraMap[id]) newIndexes.push(i);
    });
    if (newIndexes.length) probeBatch(pairsFor(newIndexes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells.join(",")]);

  // Periodic re-check (batched into one request). Never demotes a live cell to
  // "checking", so the iframe stays mounted and the stream does not reload.
  useEffect(() => {
    const t = setInterval(() => {
      const indexes = [];
      cells.forEach((id, i) => {
        if (id && cameraMap[id]) indexes.push(i);
      });
      if (indexes.length) probeBatch(pairsFor(indexes));
    }, intervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells.join(","), intervalMs]);

  const retry = (index) => {
    setStatuses((s) => ({ ...s, [index]: "checking" }));
    probeBatch(pairsFor([index]));
  };

  const togglePlay = (index) => setPlaying((p) => ({ ...p, [index]: !p[index] }));

  return { statuses, playing, retry, togglePlay };
}
