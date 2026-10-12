// YAML imported with ?parsed is parsed at build time (see parsedYaml in vite.config.ts).
declare module "*.yaml?parsed" {
  const value: object;
  export default value;
}
