import { NextResponse } from "next/server";
import { systemInfo } from "@/lib/workbench/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await systemInfo() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "System probe failed." },
      { status: 500 },
    );
  }
}
