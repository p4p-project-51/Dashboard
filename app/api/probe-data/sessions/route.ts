import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data/sessions");

function getSessionFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^\d+-\d{8}-[a-zA-Z0-9]{7}\.csv$/.test(f));
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
      const [id, date, sessionIdWithExt] = f.split("-");
      const sessionId = sessionIdWithExt.replace(/\.csv$/, "");
      const filePath = path.join(DATA_DIR, f);
      const startTimestamp = getStartTimestamp(filePath);
      return { id, startTimestamp, sessionId, date, fileName: f };
    })
    .filter((s) => s.startTimestamp !== null && s.startTimestamp !== undefined);
  return NextResponse.json(sessions);
}
