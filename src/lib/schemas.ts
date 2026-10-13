// Validators for the two data contracts, generated at build time (scripts/build-validators.mjs)
// so nothing compiles code at runtime: the web app's CSP needs no 'unsafe-eval'.

import type { ErrorObject, ValidateFunction } from "ajv";
import { validateSession as validateSessionFn } from "./generated/session-validator.js";
import { validateTurn as validateTurnFn } from "./generated/turn-validator.js";
import { validateOpening as validateOpeningFn, validatePhrase as validatePhraseFn, validateExtract as validateExtractFn, validateWriteUp as validateWriteUpFn } from "./generated/v2-validators.js";
import sessionSchema from "../../schema/session.schema.json" with { type: "json" };
import turnSchema from "../../schema/turn.schema.json" with { type: "json" };

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function run(fn: ValidateFunction, data: unknown): ValidationResult {
  const ok = fn(data) as boolean;
  return { ok, errors: ok ? [] : formatErrors(fn.errors ?? []) };
}

export function formatErrors(errors: ErrorObject[]): string[] {
  return errors.map((e) => `${e.instancePath || "/"} ${e.message ?? e.keyword}`);
}

export function validateSession(data: unknown): ValidationResult {
  return run(validateSessionFn, data);
}

export function validateTurn(data: unknown): ValidationResult {
  return run(validateTurnFn, data);
}

/** Interview engine v2: the model's outputs. */
export const validateOpening = (data: unknown) => run(validateOpeningFn, data);
export const validatePhrase = (data: unknown) => run(validatePhraseFn, data);
export const validateExtract = (data: unknown) => run(validateExtractFn, data);
export const validateWriteUp = (data: unknown) => run(validateWriteUpFn, data);

export { sessionSchema, turnSchema };
