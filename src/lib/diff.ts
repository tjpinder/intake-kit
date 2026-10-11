// A small line diff for showing the user what re-rendering would change in a file that
// already exists. Rendered files are short, so a plain LCS table is fine.

export function lineDiff(before: string, after: string, context = 2): string {
  const a = before.split("\n");
  const b = after.split("\n");
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: Array<[" " | "-" | "+", string]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ops.push([" ", a[i]]); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) ops.push(["-", a[i++]]);
    else ops.push(["+", b[j++]]);
  }
  while (i < a.length) ops.push(["-", a[i++]]);
  while (j < b.length) ops.push(["+", b[j++]]);

  // Keep changed lines plus a little context; collapse the rest.
  const keep = ops.map((_, k) => ops.slice(Math.max(0, k - context), k + context + 1).some(([op]) => op !== " "));
  const out: string[] = [];
  let skipped = false;
  ops.forEach(([op, line], k) => {
    if (keep[k]) {
      out.push(`${op} ${line}`);
      skipped = false;
    } else if (!skipped) {
      out.push("  …");
      skipped = true;
    }
  });
  return out.join("\n");
}
