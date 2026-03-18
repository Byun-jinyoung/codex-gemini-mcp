import { resolveModel } from "../config.js";
import { runCli } from "../runtime/run-cli.js";
export function buildGeminiCommand(input) {
    const model = resolveModel("gemini", input.model);
    const args = ["-p", input.prompt, "-y"];
    if (input.session_id) {
        args.push("--resume", input.session_id);
    }
    args.push("--model", model);
    return {
        command: "gemini",
        args,
        model,
    };
}
export function askGemini(input) {
    const command = buildGeminiCommand(input);
    return runCli(command.command, command.args, undefined, input.working_directory);
}
