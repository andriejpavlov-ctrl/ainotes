"use client";

import { useEffect, useRef, useState } from "react";
import { genId } from "@/lib/id";
import { GRID, STICKER_COLORS, type Board as BoardData, type Connection, type Sticker } from "@/lib/types";
import { Plus, Link2, X } from "lucide-react";

const STICKER_W = GRID * 2; // 180
const STICKER_H = GRID; // 90
const CANVAS_W = GRID * 32;
const CANVAS_H = GRID * 22;

const snap = (v: number) => Math.max(0, Math.round(v / GRID) * GRID);

// Доска со стикерами (как в Miro): перетаскивание с привязкой к сетке 90px
// и соединение стрелками.
export default function Board({
  board,
  onChange,
}: {
  board: BoardData;
  onChange: (b: BoardData) => void;
}) {
  const [stickers, setStickers] = useState<Sticker[]>(board.stickers ?? []);
  const [connections, setConnections] = useState<Connection[]>(board.connections ?? []);
  const [temp, setTemp] = useState<{ from: string; x: number; y: number } | null>(null);

  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  const canvasRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<
    | { type: "drag"; id: string; offX: number; offY: number }
    | { type: "connect"; from: string }
    | null
  >(null);

  // Дебаунс-сохранение.
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function commit() {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      onChange({ stickers: stickersRef.current, connections: connectionsRef.current });
    }, 400);
  }

  function toCanvas(e: PointerEvent | React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onMove(e: PointerEvent) {
    const it = interaction.current;
    if (!it) return;
    const p = toCanvas(e);
    if (it.type === "drag") {
      const nx = snap(p.x - it.offX);
      const ny = snap(p.y - it.offY);
      setStickers((prev) => prev.map((s) => (s.id === it.id ? { ...s, x: nx, y: ny } : s)));
    } else {
      setTemp({ from: it.from, x: p.x, y: p.y });
    }
  }

  function onUp(e: PointerEvent) {
    const it = interaction.current;
    if (it?.type === "connect") {
      const p = toCanvas(e);
      const target = stickersRef.current.find(
        (s) => s.id !== it.from && p.x >= s.x && p.x <= s.x + STICKER_W && p.y >= s.y && p.y <= s.y + STICKER_H,
      );
      if (target) addConnection(it.from, target.id);
      setTemp(null);
    }
    interaction.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    commit();
  }

  function startDrag(e: React.PointerEvent, s: Sticker) {
    e.preventDefault();
    const p = toCanvas(e);
    interaction.current = { type: "drag", id: s.id, offX: p.x - s.x, offY: p.y - s.y };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startConnect(e: React.PointerEvent, s: Sticker) {
    e.preventDefault();
    e.stopPropagation();
    const p = toCanvas(e);
    interaction.current = { type: "connect", from: s.id };
    setTemp({ from: s.id, x: p.x, y: p.y });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addSticker() {
    const n = stickers.length;
    const x = snap(GRID + (n % 6) * (STICKER_W + GRID));
    const y = snap(GRID + Math.floor(n / 6) * (STICKER_H + GRID));
    setStickers((prev) => [
      ...prev,
      { id: genId(), x, y, text: "", color: STICKER_COLORS[n % STICKER_COLORS.length] },
    ]);
    commit();
  }

  function addConnection(from: string, to: string) {
    setConnections((prev) => {
      if (prev.some((c) => (c.from === from && c.to === to) || (c.from === to && c.to === from))) return prev;
      return [...prev, { id: genId(), from, to }];
    });
  }

  function deleteSticker(id: string) {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
    commit();
  }

  function deleteConnection(id: string) {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    commit();
  }

  function setText(id: string, text: string) {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
    commit();
  }

  function cycleColor(id: string) {
    setStickers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const i = STICKER_COLORS.indexOf(s.color);
        return { ...s, color: STICKER_COLORS[(i + 1) % STICKER_COLORS.length] };
      }),
    );
    commit();
  }

  const center = (s: Sticker) => ({ x: s.x + STICKER_W / 2, y: s.y + STICKER_H / 2 });
  const byId = (id: string) => stickers.find((s) => s.id === id);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Панель доски */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2 sm:px-4">
        <button
          onClick={addSticker}
          className="flex h-8 items-center gap-1.5 rounded bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong"
        >
          <Plus size={16} /> Стикер
        </button>
        <span className="hidden text-xs text-muted sm:inline">
          Перетаскивайте за шапку (привязка к сетке 90px) • тяните за <Link2 size={12} className="inline" /> к другому стикеру
        </span>
      </div>

      {/* Холст */}
      <div className="min-h-0 flex-1 overflow-auto bg-bg">
        <div
          ref={canvasRef}
          className="relative"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            backgroundImage:
              "radial-gradient(circle, var(--border-strong) 1px, transparent 1px)",
            backgroundSize: `${GRID}px ${GRID}px`,
          }}
        >
          {/* Стрелки */}
          <svg className="pointer-events-none absolute inset-0" width={CANVAS_W} height={CANVAS_H}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill="var(--muted)" />
              </marker>
            </defs>
            {connections.map((c) => {
              const a = byId(c.from);
              const b = byId(c.to);
              if (!a || !b) return null;
              const p1 = center(a);
              const p2 = center(b);
              return (
                <line
                  key={c.id}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="var(--muted)"
                  strokeWidth={2}
                  markerEnd="url(#arrowhead)"
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => deleteConnection(c.id)}
                />
              );
            })}
            {temp && byId(temp.from) && (
              <line
                x1={center(byId(temp.from)!).x}
                y1={center(byId(temp.from)!).y}
                x2={temp.x}
                y2={temp.y}
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            )}
          </svg>

          {/* Стикеры */}
          {stickers.map((s) => (
            <div
              key={s.id}
              className="absolute flex flex-col overflow-hidden rounded-md shadow-pop"
              style={{ left: s.x, top: s.y, width: STICKER_W, minHeight: STICKER_H, background: s.color }}
            >
              <div
                className="flex h-6 cursor-move items-center justify-between px-1.5"
                style={{ touchAction: "none" }}
                onPointerDown={(e) => startDrag(e, s)}
              >
                <button
                  onClick={() => cycleColor(s.id)}
                  className="h-3.5 w-3.5 rounded-full border border-black/20"
                  style={{ background: "rgba(0,0,0,0.08)" }}
                  title="Цвет"
                  aria-label="Сменить цвет"
                />
                <div className="flex items-center gap-1">
                  <button
                    onPointerDown={(e) => startConnect(e, s)}
                    style={{ touchAction: "none" }}
                    className="flex h-4 w-4 items-center justify-center text-black/50 hover:text-black"
                    title="Соединить стрелкой"
                    aria-label="Соединить"
                  >
                    <Link2 size={13} />
                  </button>
                  <button
                    onClick={() => deleteSticker(s.id)}
                    className="flex h-4 w-4 items-center justify-center text-black/50 hover:text-black"
                    title="Удалить стикер"
                    aria-label="Удалить"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <textarea
                value={s.text}
                onChange={(e) => setText(s.id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Текст…"
                className="flex-1 resize-none bg-transparent px-2 pb-2 text-sm text-black/80 outline-none placeholder:text-black/30"
                style={{ minHeight: STICKER_H - 24 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
