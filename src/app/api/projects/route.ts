import { NextResponse } from "next/server";

const STUDIO_API = process.env.STUDIO_API_URL || "http://localhost:3000";

function mapToEditorProject(p: any) {
  const es = p.editorState || {};
  return {
    id: p.id,
    name: p.name,
    thumbnail: es.thumbnail ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    scenes: [],
    currentSceneId: es.currentSceneId || "",
    backgroundColor: es.backgroundColor ?? null,
    backgroundType: es.backgroundType ?? "color",
    blurIntensity: es.blurIntensity ?? null,
    bookmarks: es.bookmarks || [],
    fps: es.fps || 30,
    canvasSize: es.canvasSize || { width: 1080, height: 1920 },
    canvasMode: es.canvasMode || "preset",
    data: es.data ?? null,
    mediaItems: es.mediaItems || [],
    userId: "local",
  };
}

export async function GET() {
  try {
    const res = await fetch(`${STUDIO_API}/api/projects`);
    const data = await res.json();
    const projects = (data.projects || []).map(mapToEditorProject);
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${STUDIO_API}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: body.name || "Untitled video" }),
    });
    if (!res.ok) throw new Error("Failed to create project");
    const data = await res.json();
    return NextResponse.json(mapToEditorProject(data.project));
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
