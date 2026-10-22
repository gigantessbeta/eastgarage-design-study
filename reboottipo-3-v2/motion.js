/** Scroll positions describe a visual rhythm, never a measured engine speed. */
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const ramp = (progress, start, end) => clamp((progress - start) / (end - start));
export const smooth = (value) => value * value * (3 - 2 * value);
const shifts = [
    [0, 0], [.30, 4.3], [.37, 3.1], [.65, 7.4], [.72, 5.5], [1, 9],
];
export function needleRpm(progress) {
    const q = ramp(progress, .20, .80);
    for (let i = 1; i < shifts.length; i += 1) {
        const previous = shifts[i - 1];
        const next = shifts[i];
        if (q <= next[0]) {
            return previous[1] + (next[1] - previous[1]) * smooth(ramp(q, previous[0], next[0]));
        }
    }
    return 9;
}
export function flash(progress, center) {
    return Math.pow(clamp(1 - Math.abs(progress - center) / .018), .65);
}
export function fixedProgress(search) {
    const value = new URLSearchParams(search).get('p');
    if (value === null || value.trim() === '')
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
}
