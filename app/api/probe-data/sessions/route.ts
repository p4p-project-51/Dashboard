import { NextResponse } from "next/server";
import { getAllSessions } from "../helpers";

export async function GET() {
  const sessions = getAllSessions();
  return NextResponse.json(sessions);
}
