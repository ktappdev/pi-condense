import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      if (!("type" in block)) return "";

      if (
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      ) {
        return block.text;
      }

      if (block.type === "image") return "[image]";

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("condense", {
    description:
      "Start a new session seeded with this conversation's flattened transcript (no LLM summary)",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("condense requires interactive mode", "error");
        return;
      }

      await ctx.waitForIdle();

      const branch = ctx.sessionManager.getBranch();
      const sections: string[] = [];

      for (const entry of branch) {
        if (entry.type === "message") {
          const { role, content } = entry.message;
          if (role !== "user" && role !== "assistant") continue;
          const text = textFromContent(content).trim();
          if (!text) continue;
          sections.push(`${role.toUpperCase()}:\n${text}`);
        } else if (entry.type === "compaction") {
          const summary = entry.summary.trim();
          if (!summary) continue;
          sections.push(`COMPACTION SUMMARY:\n${summary}`);
        }
      }

      if (sections.length === 0) {
        ctx.ui.notify("No conversation to condense", "error");
        return;
      }

      const transcript = sections.join("\n\n---\n\n");

      // Rough guard: ~4 chars/token, refuse above ~25k tokens.
      if (transcript.length > 100_000) {
        const proceed = await ctx.ui.confirm(
          "Large transcript",
          `Transcript is ~${Math.round(transcript.length / 4)} tokens and may not fit in the new session's context. Continue?`,
        );
        if (!proceed) return;
      }

      const kickoff =
        "The message above is the flattened transcript of a previous conversation. " +
        "You are the same assistant continuing that work. " +
        "Pick up where it left off: if a task was open, resume it; " +
        "otherwise briefly state where things stand and await direction.";

      const result = await ctx.newSession({
        parentSession: ctx.sessionManager.getSessionFile(),
        setup: (sm) => {
          sm.appendMessage({
            role: "user",
            content: [{ type: "text", text: transcript }],
            timestamp: Date.now(),
          });
        },
        withSession: async (replacementCtx) => {
          await replacementCtx.sendUserMessage(kickoff);
          replacementCtx.ui.notify("Condensed into new session", "info");
        },
      });

      if (result.cancelled) {
        ctx.ui.notify("New session cancelled", "info");
      }
    },
  });
}
