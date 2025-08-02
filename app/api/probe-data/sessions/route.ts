import { NextResponse } from "next/server";

const now = Date.now();
const SESSION_IDS = [
  { id: "A", startTimestamp: now - 60 * 60 * 1000 }, // 1 hour ago
  { id: "B", startTimestamp: now - 30 * 60 * 1000 }, // 30 min ago
  { id: "C", startTimestamp: now }, // now
];

export async function GET() {
  // Return the list of available sessions with start timestamps
  return NextResponse.json(SESSION_IDS);
}
