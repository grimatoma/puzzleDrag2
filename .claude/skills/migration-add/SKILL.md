---
name: migration-add
description: Add a save schema migration when changing the shape of persisted state. Use whenever you add or rename a field in initialState that is read on save load. Bumps SAVE_SCHEMA_VERSION, scaffolds the forward migration, and writes the idempotency test.
---

# migration-add

Save schema is currently at v12 (`SAVE_SCHEMA_VERSION` in `src/migrations.js`). Every change to the shape of persisted state needs a forward migration so existing player saves don't crash.

## When to use

- Adding a new field with a default that an old save won't have (`fertilizerActive`, `magicFertilizerCharges`, `_workerEffects`).
- Renaming a field (`_toolPending` → `toolPending`, Pass 4).
- Splitting / merging fields (`state.dailies` → `state.quests`, Pass 2).
- Changing the shape (array → object — e.g. `state.hazards` from `[]` to `{ fire: ..., wolf: ... }` in Pass 3).

## Procedure

1. **Inspect the current shape** in `src/migrations.js`. Note the current `SAVE_SCHEMA_VERSION`.
2. **Bump** `SAVE_SCHEMA_VERSION` by 1.
3. **Add the migration function** to the `MIGRATIONS` array at the new index. Pattern:
   ```js
   MIGRATIONS[<currentVersion>] = (state) => ({
     ...state,
     // forward-migrate here. Use defaults that match initialState.
     newField: state.newField ?? <default>,
   });
   ```
4. **Idempotency**: the migration must be a no-op when the field is already present in the new shape.
5. **Write the test** in `src/__tests__/migrations.test.js` (or the existing migration test file). Two cases:
   - Old save → migrated correctly (asserts new field has the default).
   - Already-new save → unchanged (idempotency).
6. **Update `initialState`** in `src/state.js` to include the new field/shape.
7. Run `npm test -- --run` — should still be at the prior count or higher.

## Renames (extra step)

When renaming a field like `_toolPending` → `toolPending`:
- The migration sets the new key from the old: `toolPending: state.toolPending ?? state._toolPending ?? null`.
- Optionally delete the old key from the migrated state.
- Grep for all read sites of the old name and update them in the same commit.

## Shape changes (extra step)

When changing array → object (or similar):
- Migration must detect the old shape and convert it.
- Don't crash on unexpected shape — fall back to a fresh default.

## Validation checklist

```
[ ] SAVE_SCHEMA_VERSION bumped
[ ] MIGRATIONS[N] is a pure function of state
[ ] Migration is idempotent (test asserts this)
[ ] initialState in state.js matches the new shape
[ ] All read sites of the old name/shape updated
[ ] Tests pass
```

## Common pitfalls

- Forgetting to bump the version → new code reads new field on old saves → crash on `field.someProp` of undefined.
- Writing a non-idempotent migration → save reload mutates state on every load.
- Missing read sites → "the new field is set in state but the UI shows null" (Pass 2 had this with `lastChainSnapshot`).

## When to skip

- Field is purely runtime / not persisted (e.g. `_biomeRestored`, `_magicWandPending`). Check `loadSavedState` in `state.js` — if the field isn't read out of localStorage, no migration needed.
