import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data/sessions");

function getSessionFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) =>
      /^\d+ \d{4}-\d{2}-\d{2} \d{1,2}-\d{2}(am|pm) [a-zA-Z0-9]{7}\.csv$/.test(f)
    );
}

function getStartTimestamp(filePath: string) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const [ts] = line.split(",");
      const numTs = Number(ts);
      if (!isNaN(numTs) && ts !== "") return numTs;
    }
  }
  return null;
}

export async function GET() {
  const files = getSessionFiles();
  const sessions = files
    .map((f) => {
      const parts = f.split(" ");
      const sequence = parts[0];
      const date = parts[1];
      const time = parts[2];
      const idWithExt = parts[3];
      const id = idWithExt.replace(/\.csv$/, "");
      const filePath = path.join(DATA_DIR, f);
      const startTimestamp = getStartTimestamp(filePath);
      return { id, sequence, startTimestamp, date, time, fileName: f };
    })
    .filter((s) => s.startTimestamp !== null && s.startTimestamp !== undefined)
    .sort((a, b) => parseInt(b.sequence, 10) - parseInt(a.sequence, 10));
  return NextResponse.json(sessions);
}
