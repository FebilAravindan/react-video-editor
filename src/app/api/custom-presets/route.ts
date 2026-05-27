import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // No session in local dev (DATABASE_URL is a stub — auth DB not configured).
  // Return empty preset lists so the UI degrades gracefully instead of 401.
  if (!session) {
    return NextResponse.json({ own: [], published: [] });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const whereBase = category ? { category } : {};

  // Fetch user's own presets
  const ownPresets = await prisma.customPreset.findMany({
    where: {
      ...whereBase,
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch published presets from other users
  const publishedPresets = await prisma.customPreset.findMany({
    where: {
      ...whereBase,
      published: true,
      userId: { not: session.user.id },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ own: ownPresets, published: publishedPresets });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Auth DB not configured in local dev — cannot persist presets without a user.
    return NextResponse.json(
      { error: "Authentication required to save presets." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { name, category, data, published } = body;

    if (!name || !category || !data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const preset = await prisma.customPreset.create({
      data: {
        name,
        category,
        data,
        published: !!published,
        userId: session.user.id,
      },
    });

    return NextResponse.json(preset);
  } catch (error) {
    console.error("Error creating custom preset:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
