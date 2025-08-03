import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data/sessions");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getSessionFiles() {
  ensureDir();
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^\d+-\d{8}-[a-zA-Z0-9]{7}\.csv$/.test(f));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  let { sessionId, values } = body;
  if (!sessionId || typeof sessionId !== "string" || sessionId.length !== 7) {
    return NextResponse.json(
      { error: "Missing or invalid sessionId (must be 7 chars)" },
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
  // Get next incrementing session number
  const files = getSessionFiles();
  const nums = files
    .map((f) => parseInt(f.split("-")[0], 10))
    .filter((n) => Number.isFinite(n));
  const nextNum = nums.length ? Math.max(...nums) + 1 : 1;

  // Get current date in yyyymmdd
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");

  // Filename: N-yyyymmdd-sessionId.csv
  const fileName = `${nextNum}-${yyyymmdd}-${sessionId}.csv`;
  const filePath = path.join(DATA_DIR, fileName);

  // Prepare CSV header if new file
  const header = [
    "timestamp",
    ...Array.from({ length: 12 }, (_, i) => `temp${i + 1}`),
    "pumpVoltage",
    "pumpCurrent",
    "pumpPower",
    "flowSensorCurrent",
  ].join(",");

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, header + "\n", "utf8");
  }

  // Write values
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
    fs.appendFileSync(filePath, row + "\n", "utf8");
  }

  return NextResponse.json({ fileName });
}
