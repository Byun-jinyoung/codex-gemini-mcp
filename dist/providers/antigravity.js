import { resolveModel } from "../config.js";
import { runCli } from "../runtime/run-cli.js";
export function buildAntigravityCommand(input, logFile) {
    const model = resolveModel("antigravity", input.model);
    const args = ["-p", input.prompt, "--dangerously-skip-permissions"];
    if (input.session_id) {
        args.push("--conversation", input.session_id);
    }
    if (logFile) {
        args.push("--log-file", logFile);
    }
    return {
        command: "agy",
        args,
        model,
    };
}
export function askAntigravity(input) {
    const command = buildAntigravityCommand(input);
    return runCli(command.command, command.args, undefined, input.working_directory);
}
const CONV_ID_REGEX = /Created conversation ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
export function extractConversationIdFromLog(logContent) {
    const match = logContent.match(CONV_ID_REGEX);
    return match?.[1];
}
