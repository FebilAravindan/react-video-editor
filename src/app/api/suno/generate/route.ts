import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const sunoUrl = process.env.SUNO_API_URL;
  if (!sunoUrl) {
    return NextResponse.json({ error: "SUNO_API_URL not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const upstream = await fetch(`${sunoUrl}/api/custom_generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Suno service unavailable" }, { status: 503 });
  }
}
