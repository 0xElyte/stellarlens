import { NextRequest, NextResponse } from "next/server";
import { ApiNotFoundError, updateContract } from "@/lib/api";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const contractId = Number(params.id);
  const body = (await request.json().catch(() => ({}))) as { name?: string | null };

  const name = typeof body.name === "string" ? body.name.trim() || null : null;

  try {
    const updated = await updateContract(contractId, { name });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ApiNotFoundError) {
      return NextResponse.json({ error: `contract ${contractId} not found` }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
