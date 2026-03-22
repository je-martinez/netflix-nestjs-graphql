---
name: Handlers spread raw Prisma rows — assertions require objectContaining
description: GetMovieHandler and ViewSummaryLoader use { ...prismaRow, ...mappedFields } which leaves snake_case columns on returned objects; toEqual fails, objectContaining is required
type: project
---

Both `GetMovieHandler.execute()` and `ViewSummaryLoader`'s batch function map Prisma rows using the spread pattern:

```typescript
const result: Movie = { ...movie, id: movie.id.toString(), originalTitle: ..., ... };
```

At runtime the returned object carries **all** original snake_case columns (`original_title`, `created_date`, etc.) alongside the mapped camelCase properties. The TypeScript type annotation (`Movie`) hides this at compile time.

**Why:** The TypeScript type is structurally compatible but `toEqual` performs deep equality including extra properties, causing failures like `+ "created_date": ...`.

**How to apply:** When asserting the return value of a handler or dataloader that uses this spread pattern, always use:
```typescript
expect(result).toEqual(expect.objectContaining({ id: '42', title: '...' }));
```
Never use a bare `toEqual(expectedObject)` against a handler result that spreads a Prisma row.

The `GetMoviesHandler` maps nodes differently (explicit property assignment without spread), so its node objects do NOT have this issue and bare `toEqual` works there.
