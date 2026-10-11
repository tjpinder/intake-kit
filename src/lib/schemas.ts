// Compiled validators for the two data contracts. Both schemas are bundled into dist/, so the
// plugin never reads schema files at runtime.

import { Ajv2020 } from "ajv/dist/2020.js";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import formatsPlugin from "ajv-formats";
import sessionSchema from "../../schema/session.schema.json" with { type: "json" };
import turnSchema from "../../schema/turn.schema.json" with { type: "json" };

// ajv-formats is CommonJS; under ESM its function may sit on .default.
type AddFormats = (ajv: Ajv | Ajv2020) => unknown;
const formatsModule = formatsPlugin as unknown as AddFormats & { default?: AddFormats };
const addFormats: AddFormats = formatsModule.default ?? formatsModule;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function compile(ajv: Ajv | Ajv2020, schema: object): ValidateFunction {
  addFormats(ajv);
  return ajv.compile(schema);
}

const validateSessionFn = compile(new Ajv2020({ strict: true, allErrors: true }), sessionSchema);
const validateTurnFn = compile(new Ajv({ strict: true, allErrors: true }), turnSchema);

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

export { sessionSchema, turnSchema };
