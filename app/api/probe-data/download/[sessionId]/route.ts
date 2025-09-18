import { findSessionFileById, getSessionFileContentById } from "../../helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const content = getSessionFileContentById(sessionId);
  const fileName =
    findSessionFileById(sessionId)?.fileName ?? `session-${sessionId}.csv`;

  if (!content) {
    return new Response("File not found", { status: 404 });
  }

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Content-Length": content.length.toString(),
    },
  });
}
