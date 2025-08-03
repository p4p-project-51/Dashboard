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

function findFileById(id: string) {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) =>
      /^\d+ \d{4}-\d{2}-\d{2} \d{1,2}-\d{2}(am|pm) [a-zA-Z0-9]{7}\.csv$/.test(f)
    );
  return files.find((f) => f.endsWith(` ${id}.csv`));
}

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  // sessionId is now the RNG id
  const id = params.sessionId;
  const fileName = findFileById(id);
  if (!fileName) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const filePath = path.join(DATA_DIR, fileName);
  const data = parseCsv(filePath);
  return NextResponse.json(data);
}
