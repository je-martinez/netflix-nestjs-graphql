---
name: Prisma generated client ESM .js imports break Jest
description: The generated Prisma client at generated/prisma/client.ts uses .js extension imports (ESM style) that ts-jest cannot resolve without a moduleNameMapper entry
type: project
---

The generated Prisma client (`generated/prisma/client.ts`) imports internal files with `.js` extensions (`./internal/class.js`, `./internal/prismaNamespace.js`, `./enums.js`). ts-jest resolves only `.ts` files, so without a fix the entire test suite fails.

**Fix applied:** Added `"^(\\.{1,2}/.*)\\.js$": "$1"` to the `moduleNameMapper` in `package.json#jest`. This strips the `.js` extension so Jest resolves to the `.ts` source file instead.

**Why:** Prisma 7.x generates ESM-compatible output with explicit `.js` extensions as required by the Node.js ESM spec, but Jest/ts-jest operates in CommonJS mode and cannot resolve these.

**How to apply:** Any future test file that transitively imports `PrismaService` or `generated/prisma/client` will need this mapper to be present. The mapper is now in `package.json` and applies globally.

The pre-existing specs `prisma.service.spec.ts` and `health.controller.spec.ts` remain failing because they attempt to instantiate the real `PrismaService`/`PrismaClient` which tries to connect to a live database. They are not caused by the `.js` import issue but by missing DB infrastructure.
