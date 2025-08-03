import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data/sessions");

function parseCsv(filePath: string) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return {
      timestamp: values[0] ? Number(values[0]) : null,
      temperatures: header
        .slice(1, 13)
        .map((_, i) => (values[i + 1] ? Number(values[i + 1]) : null)),
      pumpVoltage: values[13] ? Number(values[13]) : null,
      pumpCurrent: values[14] ? Number(values[14]) : null,
      pumpPower: values[15] ? Number(values[15]) : null,
      flowSensorCurrent: values[16] ? Number(values[16]) : null,
    };
  });
}

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  // sessionId is now the full filename
  const fileName = params.sessionId;
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const data = parseCsv(filePath);
  return NextResponse.json(data);
}
