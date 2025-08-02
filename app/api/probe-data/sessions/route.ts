import { NextResponse } from "next/server";

const SESSION_IDS = ["A", "B", "C"];

export async function GET() {
  // Return the list of available session IDs
  return NextResponse.json(SESSION_IDS);
}
