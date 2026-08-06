import { useEffect, useState } from "react";
import { X } from "lucide-react";

let seq = 0;
let listeners = [];
const store = [];

function emit() {
  listeners.forEach((l) => l([...store]));
}

export function toast(message, type = "info") {
  const t = { id: ++seq, message, type, timer: null };
  store.push(t);
  emit();
  t.timer = setTimeout(() => dismiss(t.id), 5000);
  return t.id;
}

export function dismiss(id) {
  const i = store.findIndex((t) => t.id === id);
  if (i < 0) return;
  clearTimeout(store[i].timer);
  store.splice(i, 1);
  emit();
}

export function useToasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const l = (arr) => setItems(arr);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return items;
}

const TYPE_STYLE = {
  success: "border-green-500/40 text-green-700 dark:text-green-300",
  error: "border-red-500/40 text-red-700 dark:text-red-300",
  info: "border-gray-400 dark:border-white/20 text-gray-700 dark:text-gray-200",
};

export default function ToastContainer() {
  const items = useToasts();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`max-w-sm flex items-start gap-3 px-4 py-3 rounded-lg bg-white dark:bg-gray-900/95 border shadow-xl text-sm ${TYPE_STYLE[t.type] || TYPE_STYLE.info}`}
        >
          <span className="leading-snug">{t.message}</span>
          <button
            className="shrink-0 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            onClick={() => dismiss(t.id)}
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
