export const TARGETS: readonly ["chrome", "edge", "firefox"];
export const FIREFOX_ID: string;
export const FIREFOX_MIN_VERSION: string;
export function outDir(target: string, dev?: boolean): string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function manifestFor(target: string, base: any): any;
