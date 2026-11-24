export const cash = (n: number) =>
	"$" + Math.round(Math.abs(n)).toLocaleString("en-US");
export const signed = (n: number) => (n < -0.005 ? "−" : "+") + cash(n);
export const clamp = (n: number, min: number, max: number) =>
	Math.max(min, Math.min(max, n));
export const numeric = (v: unknown, fallback: number = 0) =>
	Number.isFinite(Number(v)) ? Number(v) : fallback;
export const fmt = (n: number, places: number = 1) => n.toFixed(places);
