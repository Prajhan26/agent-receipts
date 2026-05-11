# DriftEnv Grand Finale — Build Brief for Claude Code

## Who I am, what we're doing

I'm Hariharan (GitHub: harims95). I'm at the Meta × HuggingFace × PyTorch
OpenEnv Hackathon Grand Finale at Scaler School of Technology, Bangalore.
We cleared round 1 from 52,000+ teams. Final submission deadline:
**5:00 PM, April 26, 2026 — hard stop.**

I'm working solo (Prajhan is building a separate project; we'll pick which
one to submit). You are my engineering partner for the next ~30 hours.

## The project: DriftEnv

An OpenEnv-compliant RL environment that tests whether AI agents can handle:
1. **Ambiguity** — vague instructions where AI picks wrong interpretation confidently
2. **Context shift** — requirements change mid-task and AI ignores it

Domain: real AI development workflow scenarios (dataset prep, model selection,
training config, evaluation, deployment).

- **Live Space:** https://huggingface.co/spaces/harims95/driftenv
- **Repo:** https://github.com/harims95/driftenv
- **Theme fit:** Theme 2 (long-horizon instruction following) + Theme 5 (wildcard)

## Current state (v1, already shipped for round 1)

```
driftenv/
├── Dockerfile
├── inference.py        # [START][STEP][END] logs, OpenAI client, runs 3 tasks
├── openenv.yaml        # metadata, tasks, observation/action space
├── README.md
├── client.py
├── __init__.py
├── pyproject.toml
└── server/
    ├── app.py          # core RL logic — reset(), step(), state(), Pydantic models
    ├── dataset.json    # 25 scenarios across 5 domains
    └── requirements.txt
```

**Three difficulty tiers:**
- `easy`: 1 step — interpret vague instruction
- `medium`: 2 steps — interpret + pivot on context shift
- `hard`: 3 steps — interpret + pivot + complete

**Current scoring (THIS IS WHAT WE'RE FIXING):**
- Single `_score()` function, returns 0.0 / 0.5 / 1.0
- Final score = average across all steps
- Module-level `_state` dict (not instance vars) — server creates new env per request

**Tech stack:**
- OpenEnv framework
- FastAPI + Uvicorn
- Pydantic models
- Docker on HF Spaces port 7860
- HF router for LLM calls (Qwen/Qwen2.5-72B-Instruct in inference.py)

## Judging criteria (memorize these)

| Criterion | Weight | Means |
|-----------|--------|-------|
| Environment Innovation | **40%** | Novel, creative, challenging? Tests agent behavior in a fresh way? |
| Storytelling | **30%** | Clear problem framing, engaging demo. **Judges said: do not use AI to write the blog/video.** |
| Showing Improvement | **20%** | Reward curves, before/after, baseline comparison. Real training evidence. |
| Reward & Pipeline | **10%** | Coherent reward logic, pipeline produces real improvement. |

## The training stack (lock these in your head)

We are using **THREE libraries together**, each with a specific job:

1. **OpenEnv** — defines the environment interface (reset/step/state).
   Already done in v1. Don't touch the interface tomorrow.

2. **TRL (Hugging Face)** — provides the `GRPOTrainer` class, the RL
   algorithm, rollout collection, optimization steps. This is the trainer.

3. **Unsloth** — speeds up model loading (4-bit), training (LoRA), AND
   inference (rollouts). NOT optional. The OpenEnv hackathon guide
   explicitly says "rollouts dominate RL runtime" — Unsloth makes
   rollouts ~2x faster, which is the difference between finishing in
   budget and running out of money.

**How they connect:**
- Unsloth wraps the model: `FastLanguageModel.from_pretrained(...)`
- Unsloth wraps it in LoRA: `FastLanguageModel.get_peft_model(...)`
- Pass that model to TRL's `GRPOTrainer`
- The reward function inside `GRPOTrainer` calls our DriftEnv via the
  OpenEnv client, gets the 4-component reward back, sums it
- Before generating rollouts, call `FastLanguageModel.for_inference(model)`
  — this is the Unsloth 2x inference speedup. Easy to forget.

The hackathon's minimum requirements explicitly name "Unsloth or HF TRL."
We use both.

## Strategy: what we're building tonight + tomorrow

### What's NOT changing
- The 25 scenarios in dataset.json (limitation owned in README, not hidden)
- The 3 difficulty tiers (easy/medium/hard)
- The OpenEnv class structure (`DriftEnvironment`, `_DriftEnvAction`, etc.)
- The HF Space deployment pipeline
- The module-level `_state` pattern (it's correct for per-request instances)

### What IS changing (Priority 1 — multi-reward decomposition)

**Replace the single scalar reward with 4 independent reward components:**

1. `R_format` — Response is concise and structured (e.g., < 200 chars,
   reasonable length). Prevents agent from dumping essays.

2. `R_interpretation` — Keyword overlap with `hidden_interpretation`
   (existing logic, but now reported as its own component).

3. `R_pivot` — On step ≥2, has TWO requirements:
   (a) keyword overlap with `correct_pivot`, AND
   (b) lexical distance from agent's own step-1 response (proves they
   actually pivoted, not just got lucky on step 1)

4. `R_no_stale` — On step ≥2, graded penalty if response keyword-matches
   `wrong_pivots` OR matches their own step-1 response too closely.
   This is the anti-reward-hacking signal.

**Total step reward** = `0.1*R_format + 0.3*R_interp + 0.4*R_pivot + 0.2*R_no_stale`

**Critical:** Log all 4 components separately in `info["rewards"]` so
training plots show 4 independent curves. This is the multi-reward
defense the OpenEnv guide demands.

### What IS changing (Priority 2 — fix hard mode)

Current hard mode (step 3) just re-tests interpretation + pivot combined.
Make step 3 a real "completion" check: response must contain keywords
from BOTH `hidden_interpretation` AND `correct_pivot` simultaneously,
weighted higher than the current concat approach.

If tight on time, skip this. Hard mode being weak isn't fatal.

### What we're NOT doing (scope discipline)
- ❌ Adding new scenarios to dataset.json (25 is enough)
- ❌ Adding a 4th difficulty tier
- ❌ Refactoring the OpenEnv subclass structure
- ❌ Adding adversarial drift / prompt injection layer (cut for solo scope)
- ❌ Procedural scenario generator (out of scope solo)
- ❌ Rewriting `inference.py` (it works for the demo)

## Working agreements

### Git workflow (NON-NEGOTIABLE)
- **NEVER commit directly to `main`.** The live HF Space pulls from main.
  Breaking main breaks the Space.
- Create branch `multi-reward-v2` for all changes tonight.
- Test locally with `uvicorn server.app:app --reload --port 7860` before
  pushing.
- Only merge to main after I confirm the local server returns sensible
  rewards on a sample episode.

### Communication style
- Be terse and action-oriented. I prefer direct over polite.
- Don't ask permission for small mechanical edits — just do them and tell
  me what changed.
- DO ask before big architectural changes (renaming public APIs, removing
  files, changing OpenEnv interface contracts).
- When you finish a chunk, tell me: (1) what you changed, (2) what to test,
  (3) what's next.

### Code style
- Match the existing style in `server/app.py` — Python type hints, docstrings
  on public functions, no over-engineering.
- Keep changes minimal and surgical. Don't refactor unrelated code.
- Add comments only where the WHY is non-obvious.

## Tonight's plan (in order)

### Phase 1: Setup (15 min)
1. `git checkout -b multi-reward-v2`
2. Read `server/app.py` and `server/dataset.json` end-to-end
3. Confirm you understand the current `_score()` function and how it's
   called in `step()`
4. Report back to me: any questions about the code before we patch?

### Phase 2: Multi-reward patch (2-3 hours)
1. Add 4 helper functions: `_score_format`, `_score_interpretation`,
   `_score_pivot`, `_score_no_stale`
2. Modify `step()` to call all 4, compute weighted total, log all 4 in
   `info["rewards"]`
3. Update `_state` to track agent's previous responses (needed for
   pivot/no_stale checks)
4. Update `state()` and `breakdown` info dict to include the 4 components
5. Run locally, hit `/reset` and `/step` with curl or via inference.py
6. Verify all 4 reward components appear in the response
7. Commit on branch with message: `feat: multi-reward decomposition`

### Phase 3: Hard mode fix (optional, 1 hour)
Only if Phase 2 ran clean. Otherwise skip.

### Phase 4: Local end-to-end test (30 min)
1. Run inference.py against the local server (point it at localhost:7860)
2. Run all 3 task tiers (easy/medium/hard) for 2-3 scenarios each
3. Confirm reward components are sensible (not all zeros, not all ones)
4. Save sample outputs to `samples/baseline_local.json` for tomorrow's demo

### Phase 5: Wrap (15 min)
- Push branch to GitHub (NOT to main yet)
- Tell me what you observed in the test run
- Then I sleep. Mandatory 1 AM stop.

## Tomorrow's plan (April 26)

### 8 AM — 9 AM: Setup training notebook

1. Open Google Colab, create new notebook, save as
   `driftenv_grpo_training.ipynb`
2. Set Colab runtime to **T4 (free)** for the dry run — NOT A10G yet
3. Install dependencies in cell 1:
   ```
   !pip install unsloth trl peft accelerate datasets
   !pip install httpx pydantic  # for OpenEnv client calls
   ```
4. Login to HF: `from huggingface_hub import login; login()` (paste token)

### 9 AM — 10 AM: Build the training notebook

The notebook has these cells, in order:

**Cell A: Imports + config**
```python
from unsloth import FastLanguageModel
from trl import GRPOTrainer, GRPOConfig
import httpx
import json

MODEL_NAME = "unsloth/Qwen2.5-1.5B-Instruct"  # Unsloth's pre-optimized version
MAX_SEQ_LEN = 2048
LORA_RANK = 16
DRIFTENV_URL = "https://harims95-driftenv.hf.space"  # live Space
```

**Cell B: Load model with Unsloth (NOT plain transformers)**
```python
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LEN,
    load_in_4bit=True,
    dtype=None,  # auto
)
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_RANK,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",  # Unsloth's optimized version
)
```

**Cell C: DriftEnv client wrapper**
```python
def reset_env(task="medium"):
    r = httpx.post(f"{DRIFTENV_URL}/reset", json={"task": task})
    return r.json()

def step_env(action_text):
    r = httpx.post(f"{DRIFTENV_URL}/step",
                   json={"action": {"response": action_text}})
    return r.json()
```

**Cell D: Rollout function (the reward function for TRL)**
- Takes a batch of prompts (instructions from DriftEnv)
- Generates completions with the model (using `FastLanguageModel.for_inference(model)`
  for 2x speedup — CRITICAL)
- For each completion, calls step_env, gets the 4 reward components
- Returns the weighted sum as the scalar reward for GRPO
- ALSO logs the 4 components separately for plotting

**Cell E: GRPO config**
```python
config = GRPOConfig(
    output_dir="driftenv_grpo_run",
    num_train_epochs=1,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=1e-5,
    logging_steps=5,
    save_steps=50,
    max_prompt_length=512,
    max_completion_length=256,
    num_generations=4,  # GRPO group size — 4 completions per prompt to compare
    temperature=0.9,
    report_to="none",  # we'll plot manually
)
```

**Cell F: Trainer + train**
```python
trainer = GRPOTrainer(
    model=model,
    reward_funcs=[driftenv_reward_fn],  # Cell D
    args=config,
    train_dataset=prompt_dataset,  # built from DriftEnv scenarios
)
trainer.train()
```

### 10 AM — 10:30 AM: T4 dry run

1. **DO NOT switch to A10G yet.**
2. Run cells A-F on free T4 with `num_train_epochs=0.05` (just a few steps)
3. Goal: confirm no errors, model loads, rollouts hit the Space, rewards
   come back as floats, training step completes
4. If anything errors, fix on T4 (free) — DO NOT debug on paid GPU
5. Common errors to watch for:
   - HF Space cold start (first request takes 30s — pre-warm by hitting `/`)
   - LoRA target modules wrong for Qwen — confirm with `model.print_trainable_parameters()`
   - GRPO num_generations × batch_size > VRAM — reduce if OOM

### 10:30 AM — 11 AM: Switch to A10G and launch real run

1. Colab → Runtime → Change runtime type → A10G (paid, ~$1.05/hr)
2. Re-run cells A-F (Colab loses state on runtime change)
3. Set `num_train_epochs=1` or `max_steps=200`
4. Click run, set a 6-hour timer in your phone

### 11 AM — 5 PM (or training end): Monitor and prep

While training runs in background, do these in parallel:

**Baseline rollouts** (do this FIRST in a separate Colab notebook):
1. Load Qwen2.5-1.5B-Instruct WITHOUT any training (vanilla)
2. Run 3 scenarios from DriftEnv at each difficulty tier (9 episodes total)
3. Save outputs to `baseline_rollouts.json` — these are your "before" data

**Monitor training:**
- Every 30 min, check that reward is climbing
- Look at `wandb` or printed logs for the 4 reward components
- If reward is FLAT after 1 hour, something's wrong — paste logs to me

**Stop training when:**
- Reward curve plateaus, OR
- Budget hits $5 remaining ($25 spent), OR
- It's 1 PM and you need to start the writeup

### After training: Generate trained rollouts

1. Save the LoRA adapter (DO NOT merge to base — Unsloth has a specific
   merge function, but for the demo just use the adapter)
2. Run the same 9 scenarios as baseline, save to `trained_rollouts.json`
3. These are your "after" data

## 1 PM — 3 PM: Story (the 30% storytelling weight)

1. Generate plots:
   - 4 reward curves (one per component) on one figure
   - Bar chart: baseline vs trained, mean reward per difficulty tier
   - Save as `.png` in `assets/` folder, commit to repo
2. Cherry-pick 3 episodes for before/after comparison (one per difficulty)
3. **I write the README intro and the blog post myself.** Claude Code can:
   - Update the technical sections
   - Embed the plots
   - Add links to video, Colab notebook, Space
   - Add the "before/after" examples
   - But the framing/narrative paragraphs are MINE.
4. Record 90-second video on phone:
   - 0:00–0:20 — what's the problem (vague AI instructions, ignored shifts)
   - 0:20–0:50 — show the env: instruction, agent picks wrong, reward signal
   - 0:50–1:20 — before/after: untrained agent fails, trained agent pivots
   - 1:20–1:30 — credits, link to Space
5. Upload video to YouTube (unlisted), grab link

## 3 PM — 4:30 PM: Submit

1. Final checks against minimum requirements:
   - [ ] OpenEnv (latest) ✓
   - [ ] Training script in Colab notebook ✓ (link in README)
   - [ ] Loss + reward plots in README ✓ (committed as PNG)
   - [ ] Mini-blog OR < 2 min video ✓ (link in README)
   - [ ] HF Space live ✓
   - [ ] README with all links ✓
2. Merge `multi-reward-v2` branch into `main`
3. Wait for HF Space to rebuild, hit it once to confirm it's live
4. Submit the URL through the official submission form
5. **Submit at 4:30 PM. Not 4:55 PM.**
6. Walk away. Done.

## Hardware + budget summary

- **Total budget:** $30 HF credits
- **Model:** Qwen2.5-1.5B-Instruct (via Unsloth's pre-optimized version)
- **Training GPU:** A10G ($1.05/hr, ~$8-10 for training)
- **Debug GPU:** T4 (free in Colab)
- **Buffer:** $20+ for retries, demo, stretch experiments

If by 2 PM tomorrow the 1.5B run is done and we have $15+ left, we may
attempt a stretch 7B run as a bonus comparison. NOT the primary plan.

## Key reminders

1. **Environment innovation is 40% of the score.** The multi-reward design
   IS the innovation. Don't dilute it.
2. **Storytelling is 30%.** The README and video matter as much as the code.
3. **One submission per team.** No second chances. Submit by 4:30 PM.
4. **Judges said: don't use AI to write the blog/video.** I write those
   myself. You can pressure-test drafts but don't write them.
5. **Don't break main.** The Space depends on it.
6. **Round every displayed reward.** No `0.30000000000000004` in plots
   or info dicts.
7. **Sleep is mandatory.** I will not pitch on no sleep. We stop at
   1 AM tonight.
8. **Use Unsloth, not vanilla transformers.** `FastLanguageModel` is the
   entry point, not `AutoModelForCausalLM`. The 2x speedup matters.
9. **Always call `FastLanguageModel.for_inference(model)` before rollouts.**
   This is the Unsloth-specific inference speedup. Easy to forget.
10. **T4 first, A10G second.** Never debug config on paid GPU.

## When in doubt

- Ask Hariharan in chat (different Claude instance, has full strategy context).
- Choose the boring, working option over the clever, untested one.
- The goal: walk out at 5 PM Sunday fully satisfied we did our best.
  Win or lose is not in our hands.

---

**First action: read the codebase end-to-end, confirm you understand the
current `_score()` flow, then ask me any questions before we patch.**
