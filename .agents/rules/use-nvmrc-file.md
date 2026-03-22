---
trigger: always_on
---

## Node Version Management (.nvmrc)

You must always respect and use the `.nvmrc` file before executing any script or command that involves Node.js.

### Mandatory Instructions:
1. **Pre-verification**: Before executing terminal commands such as `npm`, `pnpm`, `yarn`, `node`, or `npx`, make sure you are using the Node.js version specified in the root directory's `.nvmrc` file.
2. **Command Execution**: When executing terminal commands through the provided tools, ensure you activate the correct version using your preferred version manager. For example, concatenate the command with the file reading: `nvm use && pnpm install` or `source ~/.nvm/nvm.sh && nvm use && node_command...`.
3. **User Instructions**: If you are writing documentation, scripts, tasks, or asking the user to run a command manually, always include the step to set up the correct version (e.g., using `nvm use`).
4. **Dependencies**: If you install new dependencies or perform migrations, compatibility must be evaluated against the version dictated in `.nvmrc`.
5. **Do Not Bypass**: Never ignore this version requirement unless the user explicitly instructs you to work with a different temporary version.