import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data/sessions");

export type Session = {
  sequence: number;
  date: string;
  time: string;
  id: string;
  fileName: string;
};

export function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function listSessionFiles() {
  ensureDir();

  return fs
    .readdirSync(DATA_DIR)
    .filter((f) =>
      /^\d+ \d{4}-\d{2}-\d{2} \d{1,2}-\d{2}(am|pm) [a-zA-Z0-9]{7}\.csv$/.test(f)
    );
}

export function parseSessionFileName(fileName: string) {
  // Example: 1 2025-08-03 9-46pm iijkQhz.csv
  const match = fileName.match(
    /^(\d+) (\d{4}-\d{2}-\d{2}) (\d{1,2}-\d{2}(?:am|pm)) ([a-zA-Z0-9]{7})\.csv$/
  );
  if (!match) return null;

  const [_, sequence, date, time, id] = match;
  return { sequence: Number(sequence), date, time, id, fileName };
}

export function getAllSessions(): Session[] {
  return listSessionFiles()
    .map(parseSessionFileName)
    .filter((session): session is Session => {
      if (!session) return false;
      const { sequence, date, time, id, fileName } = session;

      return (
        typeof sequence === "number" &&
        typeof date === "string" &&
        typeof time === "string" &&
        typeof id === "string" &&
        typeof fileName === "string"
      );
    });
}

export function findSessionFileById(id: string) {
  return listSessionFiles()
    .map(parseSessionFileName)
    .find((info) => info && info.id === id);
}

export function getSessionFilePathById(id: string) {
  const info = findSessionFileById(id);
  if (!info) return null;
  return path.join(DATA_DIR, info.fileName);
}

export function getSessionFileContentById(id: string) {
  const filePath = getSessionFilePathById(id);
  if (!filePath || !fs.existsSync(filePath)) return null;

  return fs.readFileSync(filePath, "utf8");
}

export function parseSessionFileContent(content: string) {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj: Record<string, string> = {};

    header.forEach((key, i) => {
      obj[key] = values[i] ?? "";
    });

    return obj;
  });
}

export function getParsedSessionById(id: string) {
  const content = getSessionFileContentById(id);
  if (!content) return null;

  return parseSessionFileContent(content);
}
