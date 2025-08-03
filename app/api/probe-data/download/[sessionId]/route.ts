import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  // Find the CSV file in data/sessions matching the sessionId
  const dataDir = path.join(process.cwd(), "data/sessions");
  const files = fs.readdirSync(dataDir);
  const csvFile = files.find(
    (f) => f.includes(sessionId) && f.endsWith(".csv")
  );
  if (!csvFile) {
    return new Response("File not found", { status: 404 });
  }
  const filePath = path.join(dataDir, csvFile);
  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  return new Response(stream as any, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=\"${csvFile}\"`,
      "Content-Length": stat.size.toString(),
    },
  });
}
