import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const studioUrl = process.env.STUDIO_API_URL;
  if (!studioUrl) {
    return NextResponse.json({ error: "STUDIO_API_URL not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const upstream = await fetch(`${studioUrl}/api/ai/audio-save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    // Make localPath an absolute URL so the editor (port 3001) can reach
    // files that are served by the studio (port 3000).
    if (upstream.ok && data.localPath) {
      data.localPath = `${studioUrl}${data.localPath}`;
    }
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Studio service unavailable" }, { status: 503 });
  }
}
