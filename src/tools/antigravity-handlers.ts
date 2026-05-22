import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { getDefaultTimeoutMs, getRuntimeDir } from "../config.js";
import { logRequest } from "../logger/index.js";
import { buildAntigravityCommand, extractConversationIdFromLog } from "../providers/antigravity.js";
import { runCli } from "../runtime/run-cli.js";
import { runCliBackground } from "../runtime/run-cli-background.js";
import type { AskAntigravityInput, RuntimeLogContext } from "../types.js";

function getAgyLogPath(cwd: string | undefined, requestId: string): string {
  return path.join(getRuntimeDir(cwd), "agy-logs", `${requestId}.log`);
}

async function ensureLogDir(logFile: string): Promise<void> {
  await mkdir(path.dirname(logFile), { recursive: true });
}

async function parseSessionFromLogFile(
  logFile: string,
  stdout: string,
  existingSessionId?: string,
): Promise<string> {
  let sessionId = existingSessionId ?? "";
  try {
    const logContent = await readFile(logFile, "utf8");
    const found = extractConversationIdFromLog(logContent);
    if (found) {
      sessionId = found;
    }
  } catch {
    // log file may not exist if CLI failed before opening it
  }
  return JSON.stringify({
    session_id: sessionId,
    response: stdout.trim() || "(empty response)",
  });
}

export async function handleAskAntigravity(input: AskAntigravityInput): Promise<string> {
  const timeoutMs = getDefaultTimeoutMs();
  const requestId = randomUUID();
  const logFile = getAgyLogPath(input.working_directory, requestId);
  await ensureLogDir(logFile);

  const command = buildAntigravityCommand(input, logFile);
  const logContext: RuntimeLogContext = {
    requestId,
    provider: "antigravity",
    tool: "ask_antigravity",
    model: command.model,
    timeoutMs,
    cwd: input.working_directory,
  };

  logRequest({ context: logContext, prompt: input.prompt });

  if (input.background ?? true) {
    const metadata = await runCliBackground({
      provider: "antigravity",
      command: command.command,
      args: command.args,
      prompt: input.prompt,
      model: command.model,
      timeoutMs,
      cwd: input.working_directory,
      logContext,
      transformResponse: (stdout) =>
        parseSessionFromLogFile(logFile, stdout, input.session_id),
    });
    return JSON.stringify(metadata);
  }

  const stdout = await runCli(
    command.command,
    command.args,
    timeoutMs,
    input.working_directory,
    logContext,
  );

  return parseSessionFromLogFile(logFile, stdout, input.session_id);
}
