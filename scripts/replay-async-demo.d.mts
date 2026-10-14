// Types for scripts/replay-async-demo.mjs, which tests/async-demo.test.ts imports.
export interface DemoStep { id: string; branch?: "early"; args: string[] }
export interface DemoResult { step: DemoStep; body: any }
export function replay(root?: string): { results: DemoResult[]; packet: string; final: Record<string, string>; early: Record<string, string> };
export function walkthrough(results: DemoResult[]): string;
