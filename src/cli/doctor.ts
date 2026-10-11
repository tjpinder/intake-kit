// `node dist/doctor.mjs` — the first thing every skill runs. Prints one line the skill can
// read: the kit version and Node version, or (via the bundle banner) why it can't run. The
// version is stamped in at build time, so this works from the plugin and from the standalone
// kit in .agents/ alike.

declare const __INTAKE_KIT_VERSION__: string | undefined;
const version = typeof __INTAKE_KIT_VERSION__ === "string" ? __INTAKE_KIT_VERSION__ : "0.0.0-dev";

console.log(`intake-kit ${version} ready (node ${process.versions.node})`);
