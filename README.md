# pi-context-condense

Start a fresh pi session seeded with your conversation's flattened transcript. **No LLM summary, no tokens burned, nothing paraphrased.**

`/condense` takes your current session, strips it down to its conversation spine — user and assistant text only — and opens a clean session whose first message *is* that transcript. The old session stays on disk, untouched, linked as the new session's parent.

## Why

Pi's built-in `/compact` summarizes context with an LLM call: costs tokens, risks losing details in paraphrase, and hides what was dropped inside a summary paragraph.

`/condense` does it by *deletion* instead of *rewriting*:

| | `/compact` | `/condense` |
|---|---|---|
| Cost | 1 LLM call | 0 tokens |
| Fidelity | paraphrase risk | exact, verbatim |
| What you get | summary paragraph | the raw conversation |
| Auditable | no | yes — you can read exactly what the new session knows |

Great for conversation-heavy threads — design discussions, Q&A, planning — where tool output is noise and the text spine is what matters.

## Measured

Real numbers from 54 pi sessions (same flatten logic, run over session files):

| | |
|---|---|
| Average reduction | **95.5% smaller** — 7.1 MB of session files → 321 KB of transcript |
| Best session | 99.8% smaller |
| Cost | 0 tokens, 0 LLM calls |

## Install

```
pi install npm:pi-context-condense
pi install git:github.com/ktappdev/pi-condense  # direct from git
```

Then reload (`/reload`) or restart pi.

## Usage

```
/condense
```

What happens:

1. Waits for the agent to go idle, then flattens the current branch into one transcript: user + assistant text, thinking blocks dropped, tool calls/results dropped, compaction summaries kept.
2. If the transcript is over ~25k tokens, asks before continuing.
3. Creates a new session whose first message *is* the transcript.
4. Sends a kickoff message — the agent picks up where it left off in the clean session.

The old session remains on disk; `/resume` still finds it.

## Trade-offs

- **Tool calls and results don't survive the flatten.** The new session knows what was *said*, not every command that was *run*. Coding sessions with heavy execution state may lose more than a summary would keep.
- **No size reduction on the kept text.** 100 turns of conversation stays 100 turns. For long text-heavy threads, the transcript can be large — hence the 25k-token guard.
- **Condense never deletes.** It forks forward. Worst case, resume the parent.

## Requirements

Pi (tested on 0.84+). TUI mode only — `/condense` refuses non-interactive sessions.
