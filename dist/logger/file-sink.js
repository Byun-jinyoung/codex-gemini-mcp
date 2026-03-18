import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
function datePart(ts) {
    return ts.slice(0, 10);
}
function getLogFilePath(logDir, ts) {
    return path.join(logDir, `mcp-${datePart(ts)}.jsonl`);
}
export async function appendJsonlEvent(logDir, event) {
    await mkdir(logDir, { recursive: true });
    const logFile = getLogFilePath(logDir, event.ts);
    await appendFile(logFile, `${JSON.stringify(event)}\n`, "utf8");
}
