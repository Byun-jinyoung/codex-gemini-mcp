import path from "node:path";
const HARDCODED_DEFAULTS = {
    codex: "gpt-5.3-codex",
    gemini: "gemini-3-pro-preview",
};
const DEFAULT_TIMEOUT_MS = 3600000;
const MIN_CLI_TIMEOUT_MS = 300000;
const MAX_CLI_TIMEOUT_MS = 3600000;
const DEFAULT_MAX_OUTPUT_BYTES = 1048576;
function readEnvNumber(name) {
    const raw = process.env[name];
    if (!raw) {
        return undefined;
    }
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value <= 0) {
        return undefined;
    }
    return value;
}
function readEnvFlag(name) {
    return process.env[name] === "1";
}
function getBaseDir(cwd) {
    return path.resolve(cwd ?? process.cwd());
}
export function getDefaultModel(provider) {
    const envName = provider === "codex"
        ? "MCP_CODEX_DEFAULT_MODEL"
        : "MCP_GEMINI_DEFAULT_MODEL";
    const envModel = process.env[envName]?.trim();
    if (envModel) {
        return envModel;
    }
    return HARDCODED_DEFAULTS[provider];
}
export function resolveModel(provider, requestedModel) {
    const requested = requestedModel?.trim();
    if (requested) {
        return requested;
    }
    return getDefaultModel(provider);
}
export function getDefaultTimeoutMs() {
    const configured = readEnvNumber("MCP_CLI_TIMEOUT_MS");
    const raw = configured ?? DEFAULT_TIMEOUT_MS;
    return Math.min(MAX_CLI_TIMEOUT_MS, Math.max(MIN_CLI_TIMEOUT_MS, raw));
}
export function getMaxOutputBytes() {
    return readEnvNumber("MCP_MAX_OUTPUT_BYTES") ?? DEFAULT_MAX_OUTPUT_BYTES;
}
export function getLoggingFlags() {
    return {
        preview: readEnvFlag("MCP_LOG_PREVIEW"),
        fullText: readEnvFlag("MCP_LOG_FULL_TEXT"),
    };
}
export function getRuntimeDir(cwd) {
    const configured = process.env.MCP_RUNTIME_DIR?.trim();
    if (configured) {
        return path.resolve(configured);
    }
    return path.join(getBaseDir(cwd), ".codex-gemini-mcp");
}
export function getLogDir(cwd) {
    const configured = process.env.MCP_LOG_DIR?.trim();
    if (configured) {
        return path.resolve(configured);
    }
    return path.join(getRuntimeDir(cwd), "logs");
}
export function getJobsDir(cwd) {
    return path.join(getRuntimeDir(cwd), "jobs");
}
export function getPromptsDir(cwd) {
    return path.join(getRuntimeDir(cwd), "prompts");
}
