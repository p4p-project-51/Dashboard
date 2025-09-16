import fs from "fs";
import path from "path";
import {
  ensureDir,
  getAllSessions,
  atomicWriteFileSync,
  findSessionFileById,
} from "../helpers";
import { getPinMapping } from "../pinData";

const DATA_DIR = path.resolve(process.cwd(), "data/sessions");

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

export function GET() {
  const headers = new Headers();
  headers.set("Connection", "Upgrade");
  headers.set("Upgrade", "websocket");
  return new Response("Upgrade Required", { status: 426, headers });
}

export function SOCKET(
  client: import("ws").WebSocket,
  request: import("http").IncomingMessage,
  server: import("ws").WebSocketServer
) {
  console.log("A client connected");

  client.on("message", (message) => {
    console.log("Received message:", message);

    try {
      const body_str = message.toString();
      const body = JSON.parse(body_str);
      console.log("Received message:", body);

      let { id, header, values, timestamp } = body;
      header = header.map((h: string) => getPinMapping(h.trim()));

      if (!id || typeof id !== "string") {
        client.send(JSON.stringify({ error: "Missing id" }));
        return;
      }
      if (!Array.isArray(header) || header.length < 2) {
        client.send(
          JSON.stringify({ error: "Missing or invalid header array" })
        );
        return;
      }
      if (!Array.isArray(values) || values.length === 0) {
        client.send(JSON.stringify({ error: "Missing or empty values array" }));
        return;
      }

      ensureDir();

      // Try find existing session file by id, if not found, create a new one
      let fileName =
        findSessionFileById(id)?.fileName ?? getNextSessionFileName(id);
      const filePath = path.join(DATA_DIR, fileName);

      // Prepare CSV header if new file or file is empty
      if (
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8").trim() === ""
      ) {
        atomicWriteFileSync(
          filePath,
          ["Timestamp", ...header].join(",") + "\n",
          "utf8"
        );
      }

      // Write new values as a single row with timestamp
      let row;
      if (Array.isArray(values)) {
        row = [timestamp, ...values].map((val: any) => val ?? "").join(",");
        fs.appendFileSync(filePath, row + "\n", "utf8");
      } else {
        row = [timestamp, values ?? ""].join(",");
        fs.appendFileSync(filePath, row + "\n", "utf8");
      }

      // Broadcast to all clients using server.clients
      server.clients.forEach((ws: import("ws").WebSocket) => {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(JSON.stringify({ id, header, values, timestamp }));
          } catch (err) {
            console.error("Error sending message to client:", err);
          }
        }
      });
    } catch (err) {
      const msg =
        typeof err === "object" && err && "message" in err
          ? (err as any).message
          : String(err);
      client.send(JSON.stringify({ error: msg }));
    }
  });

  client.on("close", () => {
    console.log("A client disconnected");
  });
}
