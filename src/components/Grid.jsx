import Cell from "./Cell.jsx";

export default function Grid({ cells, cameraMap, statuses, playing, autoplay, suspended, onPickCell, onRetry, onPlay, onFullscreen }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3 gap-2 lg:h-full">
      {cells.map((id, i) => {
        const cam = id ? cameraMap[id] : null;
        const status = statuses[i] ?? (cam ? "checking" : "empty");
        const isPlaying = status === "online" && !suspended && (autoplay || !!playing[i]);
        return (
          <Cell
            key={i}
            index={i}
            cam={cam}
            status={status}
            playing={isPlaying}
            suspended={suspended}
            onPick={() => onPickCell(i)}
            onRetry={() => onRetry(i)}
            onPlay={() => onPlay(i)}
            onFullscreen={() => onFullscreen(i)}
          />
        );
      })}
    </div>
  );
}
