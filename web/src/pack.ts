// Rendering and downloading the spec pack in the browser: the same renderAll as the plugin,
// zipped with intake-answers.yaml.

import { strToU8, zipSync } from "fflate";
import { stringify } from "yaml";
import { renderAll, type Session } from "../../src/core.ts";
import { fw, templates } from "./kit.ts";

export const SESSION_HEADER = "# Written by intake-kit. Edit with care: every SPEC and ACCEPTANCE line is rendered from this file.\n";

export function sessionYaml(session: Session): string {
  return SESSION_HEADER + stringify(session, { lineWidth: 0, aliasDuplicateObjects: false });
}

/** Every file the intake produces, intake-answers.yaml first. */
export function packFiles(session: Session): Array<[string, string]> {
  return [["intake-answers.yaml", sessionYaml(session)], ...renderAll(session, fw, templates)];
}

export function zipPack(session: Session): Uint8Array {
  return zipSync(Object.fromEntries(packFiles(session).map(([name, text]) => [name, strToU8(text)])), { level: 6 });
}

export function downloadPack(session: Session): void {
  const blob = new Blob([zipPack(session) as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `intake-${session.session.id}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
