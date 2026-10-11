// scripts/build-api.mjs bundles these as plain text (esbuild's text loader).
declare module "*.yaml" {
  const text: string;
  export default text;
}
declare module "*.md" {
  const text: string;
  export default text;
}
