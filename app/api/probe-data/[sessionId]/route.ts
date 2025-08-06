import { NextResponse } from "next/server";
import { getParsedSessionById } from "../helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const id = (await params).sessionId;
  const data = getParsedSessionById(id);
  if (!data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
