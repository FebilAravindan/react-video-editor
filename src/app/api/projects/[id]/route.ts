import { NextResponse, NextRequest } from "next/server";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await fetch(`${STUDIO_API}/api/projects/${id}`);
    if (!res.ok) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const data = await res.json();
    return NextResponse.json(mapToEditorProject(data.project));
  } catch {
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, ...rest } = body;

    // Separate name rename from editor state fields
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;

    const editorFields = [
      "thumbnail",
      "canvasSize",
      "canvasMode",
      "fps",
      "data",
      "currentSceneId",
      "bookmarks",
      "mediaItems",
      "backgroundColor",
      "backgroundType",
      "blurIntensity",
    ];
    const editorState: Record<string, any> = {};
    for (const key of editorFields) {
      if (rest[key] !== undefined) editorState[key] = rest[key];
    }
    if (Object.keys(editorState).length > 0) updates.editorState = editorState;

    const res = await fetch(`${STUDIO_API}/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return NextResponse.json({ error: "Failed to save" }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(mapToEditorProject(data.project));
  } catch {
    return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await fetch(`${STUDIO_API}/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) return NextResponse.json({ error: "Failed to delete" }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
