import { resolveModel } from "../config.js";
import { runCli } from "../runtime/run-cli.js";
export function buildCodexCommand(input) {
    const model = resolveModel("codex", input.model);
    let args;
    if (input.session_id) {
        args = ["exec", "resume", input.session_id, "--json"];
    }
    else {
        args = ["exec", "--json"];
    }
    args.push("--model", model);
    if (input.reasoning_effort) {
        args.push("-c", `model_reasoning_effort=${input.reasoning_effort}`);
    }
    args.push(input.prompt);
    return {
        command: "codex",
        args,
        model,
    };
}
export function askCodex(input) {
    const command = buildCodexCommand(input);
    return runCli(command.command, command.args, undefined, input.working_directory);
}
