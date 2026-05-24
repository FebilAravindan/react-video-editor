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
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Studio service unavailable" }, { status: 503 });
  }
}
