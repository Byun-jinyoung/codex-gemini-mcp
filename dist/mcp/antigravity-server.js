import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkJobStatus, killJob, listJobs, waitForJob, } from "../job-management.js";
import { VERSION } from "../version.js";
import { handleAskAntigravity } from "../tools/antigravity-handlers.js";
import { AskAntigravitySchema, CheckJobStatusSchema, KillJobSchema, ListJobsSchema, WaitForJobSchema, } from "../tools/schema.js";
export function createAntigravityServer() {
    const server = new McpServer({
        name: "antigravity-mcp",
        version: VERSION,
    });
    server.registerTool("ask_antigravity", {
        description: "Send a prompt to local Antigravity CLI (agy) for design and implementation tasks. Supports foreground or background execution; background mode returns job metadata and persists prompt/response artifacts under the runtime directory.",
        inputSchema: AskAntigravitySchema.shape,
    }, async (input) => {
        try {
            const output = await handleAskAntigravity(input);
            return { content: [{ type: "text", text: output }] };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { isError: true, content: [{ type: "text", text: message }] };
        }
    });
    server.registerTool("wait_for_job", {
        description: "Block (poll) until a background job reaches terminal state (completed/failed/timeout). Returns response text on success or terminal status payload on error.",
        inputSchema: WaitForJobSchema.shape,
    }, async (input) => {
        try {
            const result = await waitForJob({
                provider: "antigravity",
                jobId: input.job_id,
                timeoutMs: input.timeout_ms,
            });
            if (result.status.status === "completed") {
                return {
                    content: [{ type: "text", text: result.responseText ?? "(empty response)" }],
                };
            }
            return {
                isError: true,
                content: [{ type: "text", text: JSON.stringify(result.status) }],
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { isError: true, content: [{ type: "text", text: message }] };
        }
    });
    server.registerTool("check_job_status", {
        description: "Get current metadata and status for a background job without blocking. Use this for non-blocking progress checks.",
        inputSchema: CheckJobStatusSchema.shape,
    }, async (input) => {
        try {
            const status = await checkJobStatus("antigravity", input.job_id);
            return { content: [{ type: "text", text: JSON.stringify(status) }] };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { isError: true, content: [{ type: "text", text: message }] };
        }
    });
    server.registerTool("kill_job", {
        description: "Send a process signal to a running background job (SIGTERM by default). Stops active jobs and records terminal state.",
        inputSchema: KillJobSchema.shape,
    }, async (input) => {
        try {
            const status = await killJob({
                provider: "antigravity",
                jobId: input.job_id,
                signal: input.signal,
            });
            return { content: [{ type: "text", text: JSON.stringify(status) }] };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { isError: true, content: [{ type: "text", text: message }] };
        }
    });
    server.registerTool("list_jobs", {
        description: "List persisted background jobs with optional status filtering and result limit. Jobs are returned in descending recency order.",
        inputSchema: ListJobsSchema.shape,
    }, async (input) => {
        try {
            const jobs = await listJobs({
                provider: "antigravity",
                statusFilter: input.status_filter,
                limit: input.limit,
            });
            return { content: [{ type: "text", text: JSON.stringify(jobs) }] };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { isError: true, content: [{ type: "text", text: message }] };
        }
    });
    return server;
}
