/**
 * Compile-time guard: every string in {@link ActionType} must have a branch in
 * {@link TypedActionType}. When `ACTION_TYPES` grows without a matching interface in
 * `actionPayloads.ts`, `Check` becomes `never` and the `const _ok` line fails to typecheck.
 */
import type { ActionType } from "./actions.js";
import type { TypedActionType } from "./actionPayloads.js";

type MissingTypedBranches = Exclude<ActionType, TypedActionType>;
type Check = MissingTypedBranches extends never ? true : never;

const _ok: Check = true;
void _ok;
