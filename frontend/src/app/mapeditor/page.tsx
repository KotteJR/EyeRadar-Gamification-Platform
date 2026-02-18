"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const MAP_WIDTH = 80;
const MAP_HEIGHT = 80;
const CELL_SIZE = 10;
const TILE_SIZE = 16;

// Terrain types stored in the grid
// 0=grass, 1=pine forest, 2=water, 3=oak forest, 4=willow forest
// 5=stone/gravel, 6=path, 7=sand, 8=lava, 9=snow, 10=swamp
type TerrainType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const TERRAIN_META: { id: TerrainType; label: string; color: string; key: string }[] = [
  { id: 0, label: "Grass", color: "#2d5a1e", key: "0" },
  { id: 1, label: "Pine Forest", color: "#1a4a22", key: "1" },
  { id: 3, label: "Oak Forest", color: "#2a4a12", key: "3" },
  { id: 4, label: "Willow (big)", color: "#0a5a3a", key: "4" },
  { id: 2, label: "Water / Pond", color: "#1a4a6a", key: "2" },
  { id: 5, label: "Stone / Gravel", color: "#666666", key: "5" },
  { id: 6, label: "Path / Dirt", color: "#8b7355", key: "6" },
  { id: 7, label: "Sand / Desert", color: "#c2a64e", key: "7" },
  { id: 8, label: "Lava", color: "#cc3300", key: "8" },
  { id: 9, label: "Snow / Ice", color: "#d0e8f0", key: "9" },
  { id: 10, label: "Swamp", color: "#3a5a2a", key: "s" },
];

type ObjectType = "house" | "rocks" | "stump" | "pond" | "apple" | "tree" | "pine" | "oak"
  | "willow" | "birch" | "bush" | "berry-bush" | "gravel-tile" | "grass-tile";

const OBJECT_META: { id: ObjectType; label: string; color: string; symbol: string }[] = [
  { id: "house", label: "House", color: "#c8a040", symbol: "H" },
  { id: "rocks", label: "Rocks", color: "#888", symbol: "R" },
  { id: "stump", label: "Stump", color: "#8b6914", symbol: "S" },
  { id: "pond", label: "Pond obj", color: "#2277aa", symbol: "~" },
  { id: "apple", label: "Apple", color: "#cc3333", symbol: "A" },
  { id: "tree", label: "Tree (generic)", color: "#227722", symbol: "T" },
  { id: "pine", label: "Pine Tree", color: "#115511", symbol: "p" },
  { id: "oak", label: "Oak Tree", color: "#338822", symbol: "o" },
  { id: "willow", label: "Willow Tree", color: "#116655", symbol: "w" },
  { id: "birch", label: "Birch Tree", color: "#88aa55", symbol: "B" },
  { id: "bush", label: "Bush", color: "#44aa44", symbol: "b" },
  { id: "berry-bush", label: "Berry Bush", color: "#aa44aa", symbol: "!" },
  { id: "gravel-tile", label: "Gravel Tile", color: "#777", symbol: "g" },
  { id: "grass-tile", label: "Grass Tile", color: "#3a6a2a", symbol: "G" },
];

interface MapObject { type: ObjectType; x: number; y: number }
interface MapData { grid: number[][]; objects: MapObject[]; width: number; height: number; name?: string }
type EditorMode = "terrain" | "objects" | "eraser";

function createEmptyGrid(): number[][] {
  const g: number[][] = [];
  for (let y = 0; y <= MAP_HEIGHT; y++) { g[y] = []; for (let x = 0; x <= MAP_WIDTH; x++) g[y][x] = 0; }
  return g;
}

function generateProcedural(): number[][] {
  const gW = MAP_WIDTH + 1, gH = MAP_HEIGHT + 1, g = createEmptyGrid();
  const cx = gW / 2, cy = gH / 2;
  for (let y = 0; y < gH; y++) for (let x = 0; x < gW; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (d < 8 || Math.abs(y - cy) < 4 || Math.abs(x - cx) < 4) continue;
    const ef = Math.min(x, gW - x, y, gH - y) / 15;
    const n = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.5 + 0.5;
    if (n > 0.6 - ef * 0.3 || d > gW * 0.35) g[y][x] = Math.sin(x * 0.2 + y * 0.3) > 0 ? 1 : 3;
  }
  // Water ponds
  [[0.3, 0.35, 3, 2], [0.7, 0.65, 4, 2], [0.55, 0.2, 2, 2]].forEach(([px, py, rx, ry]) => {
    for (let y = 0; y < gH; y++) for (let x = 0; x < gW; x++) {
      const dx = (x - gW * px) / rx, dy = (y - gH * py) / ry;
      if (dx * dx + dy * dy < 1 && g[y][x] === 0) g[y][x] = 2;
    }
  });
  // Stone patches
  [[0.8, 0.3, 3, 2]].forEach(([px, py, rx, ry]) => {
    for (let y = 0; y < gH; y++) for (let x = 0; x < gW; x++) {
      const dx = (x - gW * px) / rx, dy = (y - gH * py) / ry;
      if (dx * dx + dy * dy < 1 && g[y][x] === 0) g[y][x] = 5;
    }
  });
  // Path through center
  for (let x = 0; x < gW; x++) {
    for (let dy = -1; dy <= 1; dy++) {
      const py = Math.floor(cy) + dy;
      if (py >= 0 && py < gH && g[py][x] === 0) g[py][x] = 6;
    }
  }
  return g;
}

export default function MapEditorPage() {
  const [grid, setGrid] = useState<number[][]>(() => generateProcedural());
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [mode, setMode] = useState<EditorMode>("terrain");
  const [brush, setBrush] = useState<TerrainType>(1);
  const [objBrush, setObjBrush] = useState<ObjectType>("house");
  const [brushSize, setBrushSize] = useState(3);
  const [painting, setPainting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [msg, setMsg] = useState("");
  const [savedMaps, setSavedMaps] = useState<string[]>([]);
  const [mapName, setMapName] = useState("default");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gW = MAP_WIDTH + 1, gH = MAP_HEIGHT + 1;

  useEffect(() => {
    fetch("/api/save-map?list=1").then(r => r.json()).then(d => {
      if (d.maps) setSavedMaps(d.maps);
    }).catch(() => {});
  }, []);

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    c.width = gW * CELL_SIZE; c.height = gH * CELL_SIZE;

    for (let y = 0; y < gH; y++) for (let x = 0; x < gW; x++) {
      const v = grid[y]?.[x] ?? 0;
      ctx.fillStyle = TERRAIN_META.find(t => t.id === v)?.color ?? "#2d5a1e";
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 0.5;
    for (let x = 0; x <= gW; x++) { ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, gH * CELL_SIZE); ctx.stroke(); }
    for (let y = 0; y <= gH; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(gW * CELL_SIZE, y * CELL_SIZE); ctx.stroke(); }

    for (const obj of objects) {
      const ox = (obj.x / TILE_SIZE) * CELL_SIZE, oy = (obj.y / TILE_SIZE) * CELL_SIZE;
      const m = OBJECT_META.find(o => o.id === obj.type);
      ctx.fillStyle = m?.color ?? "#fff";
      const r = obj.type === "house" ? 6 : 4;
      ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      ctx.fillText(m?.symbol ?? "?", ox, oy + 2.5);
    }

    // Player spawn marker
    const ccx = Math.floor(gW / 2) * CELL_SIZE, ccy = Math.floor(gH / 2) * CELL_SIZE;
    ctx.strokeStyle = "rgba(255,255,100,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ccx, ccy, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,100,0.3)"; ctx.fill();
    ctx.fillStyle = "#ff0"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("SPAWN", ccx, ccy + 3);
  }, [grid, objects, gW, gH]);

  useEffect(() => { draw(); }, [draw]);

  const getPos = useCallback((e: React.MouseEvent) => {
    const c = canvasRef.current; if (!c) return null;
    const r = c.getBoundingClientRect();
    return { px: (e.clientX - r.left) * (c.width / r.width), py: (e.clientY - r.top) * (c.height / r.height) };
  }, []);

  const paint = useCallback((e: React.MouseEvent) => {
    const p = getPos(e); if (!p) return;
    if (mode === "terrain") {
      const mx = Math.floor(p.px / CELL_SIZE), my = Math.floor(p.py / CELL_SIZE);
      const half = Math.floor(brushSize / 2), ng = grid.map(r => [...r]);
      let ch = false;
      for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) {
        const gx = mx + dx, gy = my + dy;
        if (gx >= 0 && gx < gW && gy >= 0 && gy < gH && ng[gy][gx] !== brush) { ng[gy][gx] = brush; ch = true; }
      }
      if (ch) setGrid(ng);
    } else if (mode === "objects") {
      const wx = Math.round((p.px / CELL_SIZE) * TILE_SIZE), wy = Math.round((p.py / CELL_SIZE) * TILE_SIZE);
      if (!objects.some(o => Math.abs(o.x - wx) < 20 && Math.abs(o.y - wy) < 20))
        setObjects(prev => [...prev, { type: objBrush, x: wx, y: wy }]);
    } else {
      const wx = (p.px / CELL_SIZE) * TILE_SIZE, wy = (p.py / CELL_SIZE) * TILE_SIZE;
      setObjects(prev => prev.filter(o => Math.sqrt((o.x - wx) ** 2 + (o.y - wy) ** 2) > 25));
    }
  }, [grid, objects, brush, objBrush, brushSize, mode, gW, gH, getPos]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const save = async (name: string) => {
    const data: MapData = { grid, objects, width: MAP_WIDTH, height: MAP_HEIGHT, name };
    try {
      const r = await fetch("/api/save-map", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, filename: name }) });
      if (r.ok) { flash(`Saved "${name}"! Open dungeon to play.`); setSavedMaps(prev => prev.includes(name) ? prev : [...prev, name]); }
      else flash("Save failed");
    } catch { flash("Save failed"); }
  };

  const load = async (name: string) => {
    try {
      const r = await fetch(`/game-assets/dungeon/maps/${name}.json?t=${Date.now()}`);
      const d = await r.json();
      if (d.grid) { setGrid(d.grid); setObjects(d.objects || []); setMapName(name); flash(`Loaded "${name}"`); }
    } catch { flash("Load failed"); }
  };

  const deleteMap = async (name: string) => {
    if (name === "terrain") { flash("Can't delete default map"); return; }
    setSavedMaps(prev => prev.filter(m => m !== name));
    flash(`Removed "${name}" from list`);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ grid, objects, width: MAP_WIDTH, height: MAP_HEIGHT })], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${mapName}.json`; a.click();
    flash("Downloaded");
  };

  const importJSON = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
    inp.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try { const d = JSON.parse(ev.target?.result as string);
          if (d.grid) { setGrid(d.grid); setObjects(d.objects || []); flash("Imported!"); }
        } catch { flash("Invalid JSON"); }
      };
      reader.readAsText(f);
    };
    inp.click();
  };

  const playMap = async () => {
    await save(mapName);
    window.open("/exercises/dungeon", "_blank");
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", color: "#eee", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 280, padding: 14, background: "#1a1a2e", display: "flex", flexDirection: "column", gap: 8,
        borderRight: "1px solid #333", overflowY: "auto", flexShrink: 0 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: 1 }}>Map Editor</h1>

        {/* Map name & save */}
        <div style={{ display: "flex", gap: 4 }}>
          <input value={mapName} onChange={e => setMapName(e.target.value)}
            style={{ flex: 1, padding: "6px 8px", background: "#222", border: "1px solid #444", borderRadius: 4, color: "#eee", fontSize: 12 }}
            placeholder="Map name" />
          <button onClick={() => save(mapName)} style={{ ...btn("#2d8a4e"), padding: "6px 12px", fontSize: 12 }}>Save</button>
        </div>

        {/* Saved maps */}
        {savedMaps.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {savedMaps.map(m => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button onClick={() => load(m)}
                  style={{ padding: "2px 8px", background: m === mapName ? "#446" : "#222", border: "1px solid #444",
                    borderRadius: 4, color: "#eee", fontSize: 11, cursor: "pointer" }}>{m}</button>
                {m !== "terrain" && (
                  <button onClick={() => deleteMap(m)}
                    style={{ padding: "1px 4px", background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: 10 }}>x</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Play button */}
        <button onClick={playMap} style={{ ...btn("#1155cc"), display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 }}>
          <span style={{ fontSize: 16 }}>&#9654;</span> Save &amp; Play in Dungeon
        </button>

        <hr style={{ border: "none", borderTop: "1px solid #333", margin: "2px 0" }} />

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["terrain", "objects", "eraser"] as EditorMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: mode === m ? "#446" : "#222", color: "#eee",
              border: mode === m ? "2px solid #6a8" : "2px solid transparent", borderRadius: 5 }}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {mode === "terrain" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>TERRAIN BRUSH (keys in brackets)</div>
            {TERRAIN_META.map(t => (
              <button key={t.id} onClick={() => setBrush(t.id)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                background: brush === t.id ? "#334" : "#1e1e2e",
                border: brush === t.id ? "2px solid #6a8" : "2px solid transparent",
                borderRadius: 4, cursor: "pointer", color: "#eee", fontSize: 11 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: t.color, border: "1px solid #555", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.label}</span>
                <span style={{ color: "#555", fontSize: 10 }}>[{t.key}]</span>
              </button>
            ))}
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "#888" }}>Brush size: {brushSize}</span>
              <input type="range" min={1} max={12} value={brushSize}
                onChange={e => setBrushSize(+e.target.value)} style={{ width: "100%" }} />
            </div>
          </div>
        )}

        {mode === "objects" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>OBJECTS (click to place)</div>
            {OBJECT_META.map(o => (
              <button key={o.id} onClick={() => setObjBrush(o.id)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                background: objBrush === o.id ? "#334" : "#1e1e2e",
                border: objBrush === o.id ? "2px solid #6a8" : "2px solid transparent",
                borderRadius: 4, cursor: "pointer", color: "#eee", fontSize: 11 }}>
                <span style={{ width: 14, height: 14, borderRadius: 8, background: o.color, border: "1px solid #555",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                  {o.symbol}
                </span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {mode === "eraser" && <p style={{ fontSize: 11, color: "#888" }}>Click near placed objects to remove them.</p>}

        <hr style={{ border: "none", borderTop: "1px solid #333", margin: "2px 0" }} />

        <div>
          <span style={{ fontSize: 10, color: "#888" }}>Zoom: {Math.round(zoom * 100)}%</span>
          <input type="range" min={0.3} max={3} step={0.1} value={zoom}
            onChange={e => setZoom(+e.target.value)} style={{ width: "100%" }} />
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={exportJSON} style={{ ...btn("#4a6a8a"), flex: 1, fontSize: 11 }}>Export JSON</button>
          <button onClick={importJSON} style={{ ...btn("#4a6a8a"), flex: 1, fontSize: 11 }}>Import JSON</button>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => { setGrid(generateProcedural()); setObjects([]); flash("Generated procedural map"); }}
            style={{ ...btn("#6a5a2a"), flex: 1, fontSize: 11 }}>Generate</button>
          <button onClick={() => { if (confirm("Clear entire map?")) { setGrid(createEmptyGrid()); setObjects([]); } }}
            style={{ ...btn("#6a2a2a"), flex: 1, fontSize: 11 }}>Clear All</button>
        </div>

        {msg && <div style={{ padding: "6px 10px", background: "#2a4a2a", borderRadius: 5, fontSize: 11, color: "#8f8" }}>{msg}</div>}
        <p style={{ fontSize: 9, color: "#555", margin: 0 }}>Objects: {objects.length} | Grid: {MAP_WIDTH}x{MAP_HEIGHT}</p>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, overflow: "auto", padding: 16, background: "#0d0d14" }}
        onMouseUp={() => setPainting(false)} onMouseLeave={() => setPainting(false)}>
        <canvas ref={canvasRef}
          onMouseDown={e => { setPainting(true); paint(e); }}
          onMouseMove={e => { if (painting) paint(e); }}
          onMouseUp={() => setPainting(false)}
          style={{ cursor: "crosshair", imageRendering: "pixelated",
            transform: `scale(${zoom})`, transformOrigin: "top left" }} />
      </div>

      <KeyHandler onKey={k => {
        const t = TERRAIN_META.find(t => t.key === k);
        if (t) { setBrush(t.id); setMode("terrain"); }
      }} />
    </div>
  );
}

function KeyHandler({ onKey }: { onKey: (k: string) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      onKey(e.key);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onKey]);
  return null;
}

function btn(bg: string): React.CSSProperties {
  return { padding: "8px 12px", background: bg, border: "none", borderRadius: 5, color: "#eee", cursor: "pointer", fontSize: 12, fontWeight: 600 };
}
