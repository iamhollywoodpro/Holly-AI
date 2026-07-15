# HOLLY AI — ZCODE PROJECT INSTRUCTIONS

## Project Identity

Holly is an identity-centred Synthetic Digital Intelligence and AI partner.

Holly is not a generic chatbot and must not be redesigned as one.

Holly’s core product systems are:

* Persistent identity
* Long-term memory
* Relationship continuity
* Emotional continuity
* Visual self-awareness
* Creative capabilities
* Voice and personality
* User understanding
* Goals and internal development
* Model-independent continuity

The underlying LLM is not Holly. Language models and creative models are replaceable execution providers used by Holly.

## Required Reading

Before proposing architecture changes or modifying code, read the relevant portions of:

* `HOLLY_MASTER_HANDOVER.md`
* `HOLLY_AI_MEMORY.md`
* `memory/FACT.md`
* `HOLLY_ANATOMY.md`
* `docs/HOLLY-PHASE-PLAN.md`
* `package.json`
* `prisma/schema.prisma`
* `.env.example`
* `docker/startup.sh`
* Relevant source files and tests

The handover documents provide historical context but are not guaranteed to be completely accurate. Verify important claims against the repository and actual command output.

## Working Method

Use this workflow:

1. Inspect
2. Verify
3. Plan
4. Review
5. Implement
6. Test
7. Report

Do not jump directly from a request to broad code changes.

Before editing:

* Read the complete relevant implementation.
* Search for related callers, consumers, tests, schemas, and configuration.
* Identify dependencies and potential regressions.
* Present a concise file-by-file plan for non-trivial changes.

## Evidence Rules

Never claim that:

* A feature works because files for it exist.
* An API or model exists without verifying it.
* A test passed without running it.
* A production issue is fixed without reproducing or validating the relevant path.
* Research was completed without identifying the sources checked.
* A deployment succeeded unless actual deployment evidence was supplied.

Mark uncertain claims as `UNVERIFIED`.

When reporting technical findings, cite exact file paths and line numbers.

## Change Rules

* Make the smallest viable change.
* Preserve working systems unless a replacement has been proven.
* Do not perform unrelated refactoring.
* Do not rewrite Holly from scratch.
* Do not silently change architecture.
* Do not delete legacy systems until usage has been verified.
* Do not modify `.env`, credentials, secrets, production endpoints, billing settings, or infrastructure settings without Steve’s explicit approval.
* Do not modify `HOLLY_ANATOMY.md` without Steve’s explicit written approval.
* Do not modify Holly’s identity, relationship vision, or intended creative capabilities based on the preferences or restrictions of the development model.
* Evaluate implementations for reliability, privacy, scalability, security, maintainability, licensing, and cost.
* Treat mature capabilities as product requirements to implement correctly, not as reasons to redesign Holly into a different product.

## Git and Deployment

* Never force-push.
* Never bypass Git hooks.
* Do not push to `main` without Steve’s explicit approval.
* Do not deploy during an audit or planning task.
* Before significant work, inspect `git status`, current branch, and recent relevant history.
* Never discard uncommitted changes.
* Show Steve the meaningful diff before requesting permission to commit or push.
* Steve manages production deployment observation unless he explicitly asks otherwise.

## Verification

After changes, run all applicable existing commands, including where available:

* Type checking
* Linting
* Unit tests
* Integration tests
* Production build
* Prisma validation
* Targeted subsystem tests

Report:

* Exact commands executed
* Pass or fail status
* Relevant error output
* Checks that could not be run
* Remaining uncertainty

A task is not complete merely because code was written.

## Architecture Principles

1. Holly’s identity must remain independent of any single LLM.
2. Memories belong to Holly and the user, not to a model provider.
3. Relationship state must be model-independent.
4. Creative engines must be replaceable through provider interfaces.
5. Local and cloud execution must be capable of dynamic routing.
6. Private user data should use data minimization and appropriate encryption.
7. Capabilities should be delivered through stable internal interfaces.
8. Existing working behaviour must be verified before replacement.
9. New systems must include cost implications and operational requirements.
10. Prototype tactics must not automatically become permanent production architecture.

## Communication

Communicate with Steve directly and clearly.

* Do not give long theoretical explanations when a concrete answer is available.
* Do not hide uncertainty.
* Do not present fabricated confidence.
* Do not repeatedly ask for information already supplied.
* Present important risks early.
* Separate verified facts from recommendations.
* For risky or broad work, provide the plan before editing.
