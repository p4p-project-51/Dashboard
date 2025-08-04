import { NextRequest, NextResponse } from "next/server";
import {
  ensureDir,
  getAllSessions,
  atomicWriteFileSync,
  findSessionFileById,
} from "../helpers";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data/sessions");

export async function POST(req: NextRequest) {
  const body = await req.json();
  let { id, header, values } = body;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing id" },
      { status: 400 }
    );
  }
  if (!Array.isArray(header) || header.length < 2) {
    return NextResponse.json(
      { error: "Missing or invalid header array" },
      { status: 400 }
    );
  }
  if (!Array.isArray(values) || values.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty values array" },
      { status: 400 }
    );
  }

  ensureDir();

  // Try find existing session file by id, if not found, create a new one
  let fileName =
    findSessionFileById(id)?.fileName ?? getNextSessionFileName(id);
  const filePath = path.join(DATA_DIR, fileName);

  // Prepare CSV header if new file
  if (!fs.existsSync(filePath)) {
    atomicWriteFileSync(filePath, header.join(",") + "\n", "utf8");
  }

  // Write new values
  for (const v of values) {
    const row = (v as any[]).map((val: any) => val ?? "").join(",");
    fs.appendFileSync(filePath, row + "\n", "utf8");
  }

  return NextResponse.json({ fileName, header, values });
}

function getNextSessionFileName(id: string): string {
  const files = getAllSessions();
  const sequences = files
    .map((f) => f.sequence)
    .filter((n) => Number.isFinite(n));
  const nextSequence = sequences.length ? Math.max(...sequences) + 1 : 1;

  // Get current date in yyyy-mm-dd
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Get time in 12-hour format with am/pm
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const timeStr = `${hours}-${minutes}${ampm}`;

  // Filename: sequence yyyy-mm-dd h-mm(am|pm) id.csv
  return `${nextSequence} ${dateStr} ${timeStr} ${id}.csv`;
}
