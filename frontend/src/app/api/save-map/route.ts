import { NextResponse } from "next/server";
import { writeFile, mkdir, readdir } from "fs/promises";
import path from "path";

const MAPS_DIR = path.join(process.cwd(), "public", "game-assets", "dungeon", "maps");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("list")) {
    try {
      await mkdir(MAPS_DIR, { recursive: true });
      const files = await readdir(MAPS_DIR);
      const maps = files.filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
      return NextResponse.json({ maps });
    } catch {
      return NextResponse.json({ maps: [] });
    }
  }
  return NextResponse.json({ error: "Use ?list=1" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await mkdir(MAPS_DIR, { recursive: true });

    // Use filename from data, default to "terrain"
    const name = (data.filename || "terrain").replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(MAPS_DIR, `${name}.json`);

    // Also always write to terrain.json for the game to load
    const { filename: _f, ...mapData } = data;
    await writeFile(filePath, JSON.stringify(mapData, null, 2));

    // Also save as terrain.json (the one the game loads)
    const terrainPath = path.join(MAPS_DIR, "terrain.json");
    await writeFile(terrainPath, JSON.stringify(mapData, null, 2));

    return NextResponse.json({ ok: true, name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
