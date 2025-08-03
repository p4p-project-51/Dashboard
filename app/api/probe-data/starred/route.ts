import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

const STAR_FILE = path.join(process.cwd(), "data/starred_sessions.json");

export async function GET() {
  try {
    const data = fs.readFileSync(STAR_FILE, "utf8");
    return new Response(data, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: NextRequest) {
  const { sessionId, starred } = await req.json();
  let ids: string[] = [];
  try {
    ids = JSON.parse(fs.readFileSync(STAR_FILE, "utf8"));
  } catch {}
  if (starred) {
    if (!ids.includes(sessionId)) ids.push(sessionId);
  } else {
    ids = ids.filter((id) => id !== sessionId);
  }
  fs.writeFileSync(STAR_FILE, JSON.stringify(ids));
  return new Response(JSON.stringify(ids), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
