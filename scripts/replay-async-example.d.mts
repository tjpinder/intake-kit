// Types for scripts/replay-async-example.mjs, which tests/async-example.test.ts imports.
export interface ExampleStep { id: string; branch?: "early"; args: string[] }
export interface ExampleResult { step: ExampleStep; body: any }
export function replay(root?: string): { results: ExampleResult[]; packet: string; final: Record<string, string>; early: Record<string, string> };
export function walkthrough(results: ExampleResult[]): string;
