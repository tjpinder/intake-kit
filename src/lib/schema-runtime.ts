// The three helpers the generated validators (src/lib/generated/) call at runtime, as plain ESM.
// Ajv's own runtime files are CommonJS, and Node and bundlers disagree about their default
// export, so the generated code imports these instead. Shapes match what Ajv's standalone code
// expects: `.default` for the functions, `.fullFormats[name].validate` for formats.

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a && b && typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) return a.length === (b as unknown[]).length && a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a !== a && b !== b; // NaN
}

/** String length in Unicode code points, as JSON Schema's minLength and maxLength count it. */
function ucs2length(str: string): number {
  let length = 0;
  for (const _ of str) length++;
  return length;
}

// RFC 3339 date-time, as ajv-formats' full mode checks it: real calendar dates, hours to 23,
// a leap second allowed, and a required offset.
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;
function dateTime(s: string): boolean {
  const m = DATE_TIME.exec(s);
  if (!m) return false;
  const [y, mo, d, h, mi, se] = m.slice(1, 7).map(Number);
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (!days || d < 1 || d > days || h > 23 || mi > 59 || se > 60) return false;
  const sign = m[7] === "-" ? -1 : 1, tzH = Number(m[8] ?? 0), tzM = Number(m[9] ?? 0);
  if (tzH > 23 || tzM > 59) return false;
  if (se < 60) return true;
  // A leap second only exists at 23:59 UTC (ajv-formats' rule).
  const utcMin = mi - tzM * sign;
  const utcHr = h - tzH * sign - (utcMin < 0 ? 1 : 0);
  return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1);
}

export const equal = { default: deepEqual };
export const ucs2 = { default: ucs2length };
export const formats = { fullFormats: { "date-time": { validate: dateTime } } };
