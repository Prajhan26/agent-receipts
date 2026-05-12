# CLAUDE.md — Claude Code Rulebook (Custom Build)

---

## THE ONE RULE THAT OVERRIDES EVERYTHING

If the instruction is vague or you are filling a gap with an assumption — **STOP.**
Ask one clarifying question. Do not guess and run.

---

## WHO REVIEWS AFTER YOU

Claude reviews every change you produce.
Write code as if a senior engineer is reading it cold.
No clever shortcuts. No implicit logic. Everything explicit.

---

## CORE RULES

### RULE 01: Ask Before Assuming
If the task has more than one valid interpretation, state both and ask which one.
Never pick silently.

### RULE 02: Never Touch These Without Explicit Instruction
- Clerk auth config or middleware
- Neon database schema or migrations
- Reward/grader logic in RL environments
- Environment step/reset core logic
- Any file not directly related to the task

### RULE 03: One Thing at a Time
Complete the exact task asked. Nothing more.
If you notice something broken nearby, mention it — don't fix it.

### RULE 04: No Abstractions Unless Asked
No helper functions, no utility layers, no "I'll make this reusable" — unless explicitly requested.
Solve the problem directly.

### RULE 05: Define Done Before Writing
Before any code, state in one line what success looks like.
Then build to that.

### RULE 06: Keep Diffs Clean for Codex
Every changed line must trace directly to the instruction.
No reformatting. No style fixes. No drive-by improvements.

### RULE 07: Match Existing Style
Use the same patterns already in the codebase.
Don't introduce new conventions unless the task requires it.

### RULE 08: No Silent Failures
If anything breaks or becomes unclear mid-task — stop immediately and surface it.
Never work around a problem silently.

### RULE 09: Surface Don't Solve
If you find a bug unrelated to the task — write a comment flagging it.
Do not fix it. Let the human decide.

### RULE 10: Environment Variable Check
Before running or deploying anything, verify all required environment variables are present.
If any are missing — STOP and ask. Never assume they exist.

### RULE 11: No New Dependencies Without Reason
Do not add new libraries or packages unless absolutely necessary.
Use existing tools in the stack first.
If a new dependency is needed, state why and wait for approval.

### RULE 12: FastAPI Pydantic Contract
Always ensure FastAPI response models strictly match the Pydantic schema.
Never return unvalidated data.
Serialization errors are silent killers — catch them at the model level.

### RULE 13: The 3-Step Debugging Protocol
If an error isn't fixed in one attempt:
1. **STOP** — do not keep changing code blindly
2. **ANALYZE** — list 2-3 possible root causes
3. **PROPOSE** — state the fix and why it should work before writing any code

If the fix is complex, wait for explicit "Go" from the user.

### RULE 14: Test Before Claiming Done
Run the code locally before saying "done."
If it can't be tested locally, state what manual verification is needed.
Never mark complete without proof it works.

### RULE 15: Commit Message Format
```
Format: [type] short description

Types: fix, feat, refactor, docs, test
Example: [fix] resolve API timeout on /reset endpoint
```
No vague messages like "updates" or "changes."

### RULE 16: File Creation Protocol
Before creating any new file:
1. State the filename and location
2. State why it's needed
3. Wait for approval if it's outside the task scope

### RULE 17: API Changes = Contract Changes
If any API endpoint changes:
- Input params
- Output schema
- Status codes

State the change explicitly. Frontend/backend may depend on it.

### RULE 18: Secrets & Keys
- Never hardcode secrets, API keys, or credentials
- Never print them in logs
- Never commit them to git
- If you need one, ask where it lives

---

## AFTER EVERY TASK

List exactly what you changed and what you deliberately did not touch.

---

## STACK CONTEXT

| Layer | Tools |
|-------|-------|
| Frontend | Next.js, Vercel, Clerk, Tailwind |
| Backend | FastAPI, Railway, Neon (Postgres) |
| Agent / RL | Python, OpenEnv, Docker, Hugging Face |
| Reviewer | Codex audits after every session |

---

## HOW TO KNOW THIS IS WORKING

- ✓ Diffs are small and surgical
- ✓ Clarifying questions come before code, not after mistakes
- ✓ Codex reviews have no surprise changes
- ✓ Nothing breaks that wasn't supposed to be touched
- ✓ Every change is tested before marked done
- ✓ Commits are clean and traceable
