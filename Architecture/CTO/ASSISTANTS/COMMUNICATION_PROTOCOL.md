# CTO ↔ Assistants Communication Protocol

## 1. Canonical Branch
All assistant communication files for the current phase MUST exist on:
`rescue/manual-vouchers-inventory-core`

Never use `main` for active task communication.

## 2. Roles
- CTO: final authority, reconciliation, patch/release decision.
- Hussein: Lead Analyst / builder of evidence-backed analysis.
- Morad: Adversarial Reviewer / independent challenge.
- User: mandatory review/alert point before Production patch or GO.

## 3. INBOX = TASK ONLY
CTO creates the task file FIRST, then verifies its existence on the canonical branch before asking the assistant to start.

Paths:
- `Architecture/CTO/ASSISTANTS/HUSSEIN/INBOX/`
- `Architecture/CTO/ASSISTANTS/MORAD/INBOX/`

Each task file MUST contain:
- exact task
- exact branch
- exact files to read
- exact output filename/path
- whether the assistant may execute SQL (default: NO)
- whether Production changes are allowed (default: NO)
- dependencies on the other assistant

## 4. OUTBOX = RESULT ONLY
Assistant responses MUST be written to the exact OUTBOX path specified by the task.

Paths:
- `Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/`
- `Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/`

The assistant MUST NOT invent an output path.

## 5. Cross-Review
Hussein may read Morad OUTBOX results only when the CTO explicitly assigns a review/follow-up task.
Morad may read Hussein OUTBOX results for adversarial review.
Neither assistant treats the other's report as authority; evidence and Production reality remain authoritative.

## 6. CTO Verification Gate
Before declaring a task active, CTO verifies:
1. task file exists on canonical branch;
2. assistant has access to it;
3. output path exists or is creatable;
4. branch/ref is explicit.

If any check fails, CTO fixes the communication path before asking the assistant to work.

## 7. No Chat-Only Tasks
The conversation is for coordination, clarification, and User/CTO review.
The repository is the canonical communication record.

## 8. No Guessing / No Production Drift
A missing file/path is a communication failure, not an analytical blocker.
The assistant reports it, but CTO must first verify and repair the channel.
No assistant may compensate by guessing task contents from memory.

## 9. Completion Flow
`CTO creates task → verifies task → Assistant works → OUTBOX result → CTO reads → other assistant reviews if assigned → CTO reconciliation → User review → Patch/Test/GO`
