

export let _seed = 20261021;
export function rnd(){ _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }
export const rr = (a, b) => a + rnd() * (b - a);
export const ri = (a, b) => Math.floor(rr(a, b + 0.999));
export const pick = arr => arr[Math.floor(rnd() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const TAU = Math.PI * 2;
