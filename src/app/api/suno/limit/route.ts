import { NextResponse } from "next/server";

export async function GET() {
  const sunoUrl = process.env.SUNO_API_URL;
  if (!sunoUrl) {
    return NextResponse.json({ error: "SUNO_API_URL not configured" }, { status: 500 });
  }
  try {
    const upstream = await fetch(`${sunoUrl}/api/get_limit`);
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Suno service unavailable" }, { status: 503 });
  }
}
