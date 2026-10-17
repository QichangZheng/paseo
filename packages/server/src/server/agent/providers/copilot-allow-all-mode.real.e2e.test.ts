import { beforeAll, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isCommandAvailable } from "../../../executable-resolution/executable-resolution.js";
import { createTestLogger } from "../../../test-utils/test-logger.js";
import { CopilotACPAgentClient, COPILOT_ALLOW_ALL_MODE_ID } from "./copilot-acp-agent.js";

const PLAN_MODE_ID = "https://agentclientprotocol.com/protocol/session-modes#plan";

describe("Copilot ACP provider (real) Allow All mode", () => {
  let canRun = false;

  beforeAll(async () => {
    canRun = await isCommandAvailable("copilot");
  });

  test("Plan to Allow All permits the requested file edit", async (context) => {
    if (!canRun) {
      context.skip();
    }
    const cwd = await mkdtemp(join(tmpdir(), "copilot-allow-all-real-"));
    const client = new CopilotACPAgentClient({ logger: createTestLogger() });

    try {
      const session = await client.createSession({ provider: "copilot", cwd });
      try {
        await session.setMode(PLAN_MODE_ID);
        await session.run(
          "Plan one change: create result.txt containing exactly VERIFIED. Do not implement it yet. Do not ask questions.",
        );
        await session.setMode(COPILOT_ALLOW_ALL_MODE_ID);
        await session.run(
          "Implement that plan now. Create result.txt containing exactly VERIFIED. You have approval; do not ask questions.",
        );
        expect(await readFile(join(cwd, "result.txt"), "utf8")).toBe("VERIFIED");
      } finally {
        await session.close();
      }
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }, 240_000);
});
