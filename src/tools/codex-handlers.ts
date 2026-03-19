import { randomUUID } from "node:crypto";

import { getDefaultTimeoutMs } from "../config.js";
import { logRequest } from "../logger/index.js";
import { buildCodexCommand } from "../providers/codex.js";
import { runCli } from "../runtime/run-cli.js";
import { runCliBackground } from "../runtime/run-cli-background.js";
import type { AskCodexInput, RuntimeLogContext } from "../types.js";

export async function handleAskCodex(input: AskCodexInput): Promise<string> {
  const timeoutMs = getDefaultTimeoutMs();
  const command = buildCodexCommand(input);
  const logContext: RuntimeLogContext = {
    requestId: randomUUID(),
    provider: "codex",
    tool: "ask_codex",
    model: command.model,
    timeoutMs,
    cwd: input.working_directory,
  };

  logRequest({ context: logContext, prompt: input.prompt });

  if (input.background ?? true) {
    const metadata = await runCliBackground({
      provider: "codex",
      command: command.command,
      args: command.args,
      prompt: input.prompt,
      model: command.model,
      timeoutMs,
      cwd: input.working_directory,
      logContext,
    });
    return JSON.stringify(metadata);
  }

  const raw = await runCli(
    command.command,
    command.args,
    timeoutMs,
    input.working_directory,
    logContext,
  );

  return parseCodexJsonl(raw);
}

/**
 * Parse Codex --json JSONL output into {session_id, response}.
 * Falls back to raw text if parsing fails.
 */
function parseCodexJsonl(raw: string): string {
  try {
    let sessionId = "";
    const texts: string[] = [];

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (event.type === "thread.started" && typeof event.thread_id === "string") {
        sessionId = event.thread_id;
      }
      if (event.type === "item.completed") {
        const item = event.item as Record<string, unknown> | undefined;
        if (item && typeof item.text === "string") {
          texts.push(item.text);
        }
      }
    }

    const response = texts.join("\n").trim();
    if (sessionId || response) {
      return JSON.stringify({ session_id: sessionId, response: response || "(empty response)" });
    }
  } catch {
    // fall through
  }

  return raw;
}
