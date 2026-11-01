import type { HearthApi } from './hearthContext';

const SVG_NS = 'http://www.w3.org/2000/svg';
let filterCount = 0; // gives every burn its own filter id
let holder: SVGSVGElement | null = null;

// A hidden SVG that holds the temporary burn filters
// It is created by hand and kept outside React's tree, because React would remove nodes it did not render itself
function filterHolder(): SVGSVGElement {
    if (!holder || !holder.isConnected) {
        holder = document.createElementNS(SVG_NS, 'svg');
        holder.setAttribute('width', '0');
        holder.setAttribute('height', '0');
        holder.setAttribute('aria-hidden', 'true');
        holder.style.position = 'absolute';
        document.body.appendChild(holder);
    }
    return holder;
}

// Builds one burn filter
// Fractal noise decides which pixels burn first. "keep" turns that noise into a mask that shrinks as its intercept falls,
// "edge" is the same mask a little ahead of it, and the gap between the two is painted orange as the glowing edge
function createBurnFilter(id: string): { filter: SVGFilterElement; keep: Element; edge: Element } {
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('x', '-10%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '120%');
    filter.setAttribute('height', '140%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.innerHTML =
        `<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="${filterCount * 7}" result="noise"/>`
        + '<feComponentTransfer in="noise" result="keep"><feFuncA type="linear" slope="8" intercept="2"/></feComponentTransfer>'
        + '<feComponentTransfer in="noise" result="edge"><feFuncA type="linear" slope="8" intercept="2.3"/></feComponentTransfer>'
        + '<feComposite in="SourceGraphic" in2="keep" operator="in" result="kept"/>'
        + '<feFlood flood-color="#ff8a3d" result="flame"/>'
        + '<feComposite in="flame" in2="edge" operator="in" result="flameEdge"/>'
        + '<feComposite in="flameEdge" in2="keep" operator="out" result="band"/>'
        + '<feComposite in="band" in2="SourceAlpha" operator="in" result="bandShape"/>'
        + '<feMerge><feMergeNode in="bandShape"/><feMergeNode in="kept"/></feMerge>';
    const [keep, edge] = Array.from(filter.querySelectorAll('feFuncA'));
    return { filter, keep, edge };
}

// Burns elements away and resolves once they are invisible
// The caller removes them from React state afterwards, then calls restoreBurned in case some are still on screen
export function burnAway(elements: HTMLElement[], hearth: HearthApi, durationMs = 900): Promise<void> {
    if (elements.length === 0) {
        return Promise.resolve();
    }
    if (hearth.reducedMotion) {
        // No travel and no particles, only a short fade
        const fades = elements.map((element) => element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished);
        return Promise.all(fades).then(() => undefined);
    }

    const svg = filterHolder();
    const burns = elements.map((element) => {
        const id = `hearth-burn-${++filterCount}`;
        const parts = createBurnFilter(id);
        svg.appendChild(parts.filter);
        element.style.filter = `url(#${id})`;
        return { element, ...parts };
    });

    return new Promise((resolve) => {
        const start = performance.now();
        const step = (now: number): void => {
            const progress = Math.min(1, (now - start) / durationMs);
            const eased = progress * progress * (3 - 2 * progress); // smoothstep: catches slowly, burns fast, settles at the end
            const threshold = 2 - 9.4 * eased; // sweeps from "every pixel kept" to "no pixel kept"
            burns.forEach((burn) => {
                burn.keep.setAttribute('intercept', threshold.toFixed(3));
                burn.edge.setAttribute('intercept', (threshold + 0.3).toFixed(3)); // a narrow band, so only the edge glows
                if (progress < 0.9) {
                    hearth.scorch(burn.element.getBoundingClientRect());
                }
            });
            if (progress < 1) {
                requestAnimationFrame(step);
                return;
            }
            burns.forEach((burn) => {
                burn.element.style.visibility = 'hidden'; // stays hidden until React removes it
                burn.element.style.filter = '';
                burn.filter.remove();
            });
            resolve();
        };
        requestAnimationFrame(step);
    });
}

// Undoes the burn on elements that are still on screen, for example when the refresh after a delete failed and the item is still real
export function restoreBurned(elements: HTMLElement[]): void {
    elements.forEach((element) => {
        element.style.visibility = '';
        element.style.filter = '';
        element.getAnimations().forEach((animation) => animation.cancel());
    });
}
