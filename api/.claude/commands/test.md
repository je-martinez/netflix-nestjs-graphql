Generate comprehensive unit tests for the following file or module: $ARGUMENTS

**Instructions for the agent:**

1. If $ARGUMENTS is a file path, read that specific file and generate its `.spec.ts`.
2. If $ARGUMENTS is a module name (e.g. `users`), glob all non-spec TypeScript
   files under `src/**/$ARGUMENTS/**/*.ts` and generate a spec for each one
   that doesn't already have full coverage.
3. If $ARGUMENTS is empty, look at the last file touched in the git working tree
   (`git diff --name-only HEAD | grep -v spec | head -1`) and use that.

Follow the full workflow defined in the `nestjs-unit-tester` agent:
explore context → plan → generate → validate (run Jest, fix failures, re-run).

Do not finish until all generated specs pass green.
