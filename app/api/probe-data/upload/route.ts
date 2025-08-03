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
  let { id, values } = body;
  if (!id || typeof id !== "string" || id.length !== 7) {
    return NextResponse.json(
      { error: "Missing or invalid id (must be 7 chars)" },
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
    const header = [
      "timestamp",
      ...Array.from({ length: 12 }, (_, i) => `temp${i + 1}`),
      "pumpVoltage",
      "pumpCurrent",
      "pumpPower",
      "flowSensorCurrent",
    ].join(",");

    atomicWriteFileSync(filePath, header + "\n", "utf8");
  }

  // Write new values
  for (const v of values) {
    const row = [
      v.timestamp ?? "",
      ...(v.temperatures ?? Array(12).fill("")).map(
        (t: number | null) => t ?? ""
      ),
      v.pumpVoltage ?? "",
      v.pumpCurrent ?? "",
      v.pumpPower ?? "",
      v.flowSensorCurrent ?? "",
    ].join(",");

    // Appending is atomic if the written data is small enough
    fs.appendFileSync(filePath, row + "\n", "utf8");
  }

  return NextResponse.json({ fileName });
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
