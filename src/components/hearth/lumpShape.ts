// An irregular rounded outline for a coal, so no two coals are the same perfect circle.
// It is worked out from a number (an id) with fixed arithmetic, so the same person or room always gets the same lump.
// Shared by every screen that draws coals: the friends circle and list, the messages scale, the group picker
export function lumpShape(id: number): string {
    const a = 40 + ((id * 37) % 21); // each value lands between 40 and 60 percent
    const b = 40 + ((id * 53) % 21);
    const c = 40 + ((id * 71) % 21);
    const d = 40 + ((id * 89) % 21);
    // The eight values set the horizontal and vertical radius of each corner, the slash separates the two sets
    return `${a}% ${100 - a}% ${b}% ${100 - b}% / ${c}% ${d}% ${100 - d}% ${100 - c}%`;
}
