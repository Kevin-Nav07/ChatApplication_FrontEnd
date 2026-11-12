import React, { useEffect, useMemo, useRef } from 'react';
import { HearthContext, type HearthApi } from './hearthContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import styles from './hearth.module.css';

// One moving point of light, smoke or ash on a canvas
interface Particle {
    x: number;
    y: number;
    vx: number; // pixels moved sideways each frame
    vy: number; // pixels moved down each frame, negative values rise
    r: number; // radius in pixels
    life: number; // starts at 1, the particle is removed when it reaches 0
    decay: number; // how much life is lost each frame
    t: number; // phase of the side to side sway
    sway: number; // how fast the sway runs, 0 for none
    color: string; // "r,g,b" so the alpha can be added when it is drawn
    drag?: number; // multiplies the velocity every frame, below 1 slows the particle down
    gravity?: number; // added to vy every frame, negative floats up and positive falls
    grow?: number; // added to the radius every frame, used by smoke as it spreads
    ax?: number; // the x position a flame leans back toward; set for the wide bed fire, where every flame has its own centre line
}

// Every particle list the loop draws, kept together so the API functions and the loop share them
interface ParticleLists {
    embers: Particle[]; // ambient embers rising from below the screen and from the fire
    flames: Particle[]; // the fire itself
    smoke: Particle[]; // soft smoke above the fire
    sparks: Particle[]; // sparks from actions, drawn on the top canvas
    ash: Particle[]; // grey flakes that fall from things that burn
}

// Where the fire burns right now, read from whichever element is marked with data-hearth-fire
interface FirePlace {
    x: number;
    y: number;
    size: number; // the size the fire is scaled against, 600 is the size it was designed at
    kindling: boolean; // true while data loads, the fire burns low and grows when it is done
    shape: 'round' | 'bed'; // round is one campfire in the centre; bed is a long low bed of coals along the element's bottom edge
    left: number; // the element's edges in window pixels, used by the bed to know how wide to burn
    width: number;
    bottom: number;
}

const EMBER_COLORS = ['229,117,61', '215,130,75', '178,69,26', '240,190,140', '255,170,100'];
const DESIGN_SIZE = 600;
const MAX_EMBERS = 160;

// Picks one of the brand's ember colours at random
function pickColor(): string {
    return EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)];
}

// Finds the element that wants a fire in its centre. Only one is on screen at a time: the friends circle or the messages hearth
function findFire(): FirePlace | null {
    const element = document.querySelector<HTMLElement>('[data-hearth-fire]');
    if (!element) {
        return null;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) {
        return null; // the element exists but is hidden
    }
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        size: Number(element.dataset.hearthSize) || rect.width, // data-hearth-size lets a small element ask for a bigger fire
        kindling: element.dataset.hearthIntensity === 'kindling',
        shape: element.dataset.hearthShape === 'bed' ? 'bed' : 'round', // data-hearth-shape="bed" asks for the long low fire
        left: rect.left,
        width: rect.width,
        bottom: rect.bottom
    };
}

// True while a screen has asked for a calm room with data-hearth-calm: no drifting embers or rising sparks,
// only the fire itself. The messages screen asks for this so nothing small and glowing floats over the conversation
function isCalm(): boolean {
    return document.querySelector('[data-hearth-calm]') !== null;
}

// The light of a fire somewhere below the window, warming every screen from its bottom edge
function drawRoomGlow(ctx: CanvasRenderingContext2D, width: number, height: number, flicker: number, strength: number): void {
    const glow = ctx.createRadialGradient(width / 2, height * 1.08, 10, width / 2, height * 1.08, Math.max(width, height) * 0.75);
    glow.addColorStop(0, `rgba(229,117,61,${strength * flicker})`);
    glow.addColorStop(0.45, `rgba(118,34,22,${strength * 0.35 * flicker})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
}

// Adds one flame particle at the base of the fire
function spawnFlame(lists: ParticleLists, fire: FirePlace, scale: number): void {
    if (fire.shape === 'bed') {
        // Two random numbers averaged give a triangle shaped spread, so the bed burns fuller in the middle than at its ends
        const x = fire.left + fire.width * ((Math.random() + Math.random()) / 2);
        lists.flames.push({
            x,
            ax: x,
            y: fire.bottom - 14,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -(0.7 + Math.random() * 1.1), // slower than the campfire, so the flames stay low
            r: 5 + Math.random() * 6,
            life: 1,
            decay: 0.03 + Math.random() * 0.025,
            t: 0,
            sway: 0,
            color: ''
        });
        return;
    }
    lists.flames.push({
        x: fire.x + (Math.random() - 0.5) * 46 * scale,
        y: fire.y + 20 * scale,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(1.2 + Math.random() * 1.6) * scale,
        r: (6 + Math.random() * 7) * scale,
        life: 1,
        decay: 0.024 + Math.random() * 0.022,
        t: 0,
        sway: 0,
        color: ''
    });
}

// Moves and draws the flame particles. Many faint particles are added on top of each other ('lighter' adds their colours
// together), and each is pulled toward its centre line so they taper into tongues. Shared by the campfire and the bed
function drawFlames(ctx: CanvasRenderingContext2D, lists: ParticleLists, fire: FirePlace, live: boolean): void {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = lists.flames.length - 1; i >= 0; i--) {
        const flame = lists.flames[i];
        if (live) {
            flame.x += flame.vx + ((flame.ax ?? fire.x) - flame.x) * 0.012; // ax is the bed flame's own centre, the campfire uses the fire's
            flame.y += flame.vy;
            flame.life -= flame.decay;
        }
        if (flame.life <= 0) {
            lists.flames.splice(i, 1);
            continue;
        }
        const color = flame.life > 0.8 ? '255,214,150' : flame.life > 0.5 ? '255,136,52' : '178,56,20';
        ctx.fillStyle = `rgba(${color},${Math.min(1, flame.life * 1.2) * 0.2})`; // each one stays faint or the overlap saturates to white
        ctx.beginPath();
        ctx.arc(flame.x, flame.y, flame.r * (0.35 + 0.65 * flame.life), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// Draws the long low fire that burns along the bottom of the messages screen: a wide pool of light on the floor,
// a row of coals glowing through their cracks, and short flames. boost is above 0 for a moment after flare() is called
function drawBed(ctx: CanvasRenderingContext2D, lists: ParticleLists, fire: FirePlace, flicker: number, intensity: number, boost: number, live: boolean): void {
    const heat = intensity * (1 + boost * 0.9);

    // Floor light: a circle gradient squashed into a wide ellipse by scaling the canvas before drawing it
    const radius = fire.width * 0.6;
    ctx.save();
    ctx.translate(fire.x, fire.bottom);
    ctx.scale(1, 0.4);
    const floor = ctx.createRadialGradient(0, 0, 4, 0, 0, radius);
    floor.addColorStop(0, `rgba(255,150,70,${Math.min(0.6, 0.3 * flicker * heat)})`);
    floor.addColorStop(0.3, `rgba(229,117,61,${0.13 * flicker * heat})`);
    floor.addColorStop(0.65, `rgba(118,34,22,${0.05 * flicker * heat})`);
    floor.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floor;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();

    // The coals: dark lumps, each lit from inside. Their sizes come from a fixed formula, not Math.random, so they stay put between frames
    const coalCount = Math.max(8, Math.round(fire.width / 34));
    for (let i = 0; i < coalCount; i++) {
        const along = (i + 0.5) / coalCount;
        const taper = Math.sin(Math.PI * along); // 0 at the ends, 1 in the middle, so the bed thins out at its edges
        const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1; // a repeatable pseudo random number per coal
        const x = fire.left + along * fire.width;
        const y = fire.bottom - 6 - seed * 4;
        const rx = (10 + seed * 14) * (0.5 + 0.5 * taper);
        const ry = (5 + seed * 4) * (0.5 + 0.5 * taper);
        ctx.fillStyle = '#1d140e';
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        const glow = ctx.createRadialGradient(x, y, 0, x, y, rx);
        const wave = 0.75 + 0.25 * Math.sin(performance.now() / 700 + i * 1.7); // each coal breathes on its own rhythm
        glow.addColorStop(0, `rgba(255,140,60,${(0.3 + 0.45 * seed) * taper * wave * Math.min(1.4, heat)})`);
        glow.addColorStop(1, 'rgba(255,140,60,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    if (live) {
        const flameCount = Math.round((fire.width / 110) * (0.25 + 0.9 * intensity) * (1 + 1.6 * boost));
        for (let i = 0; i < flameCount; i++) {
            spawnFlame(lists, fire, 1);
        }
    }
    drawFlames(ctx, lists, fire, live);
}

// Draws the fire: the light it throws on the floor, two charred logs, smoke, and the flames
// live is false when motion is reduced, then the particles are drawn where they are without moving.
// embers is false in a calm room, where the fire throws no embers up into the window
function drawFire(ctx: CanvasRenderingContext2D, lists: ParticleLists, fire: FirePlace, flicker: number, intensity: number, live: boolean, embers = true, boost = 0): void {
    if (fire.shape === 'bed') {
        drawBed(ctx, lists, fire, flicker, intensity, boost, live);
        return;
    }
    const scale = (fire.size / DESIGN_SIZE) * (0.45 + 0.55 * intensity) * (1 + boost * 0.25); // kindling burns smaller, a flare a little bigger

    // Floor light
    const floor = ctx.createRadialGradient(fire.x, fire.y + 24 * scale, 4, fire.x, fire.y + 14 * scale, fire.size * 0.58);
    floor.addColorStop(0, `rgba(255,150,70,${0.32 * flicker * intensity})`);
    floor.addColorStop(0.16, `rgba(229,117,61,${0.13 * flicker * intensity})`);
    floor.addColorStop(0.5, `rgba(140,50,20,${0.05 * flicker * intensity})`);
    floor.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floor;
    ctx.fillRect(fire.x - fire.size * 0.62, fire.y - fire.size * 0.62, fire.size * 1.24, fire.size * 1.24);

    // Two crossed logs with a glowing crack along each
    const logs = [
        [fire.x - 42 * scale, fire.y + 32 * scale, fire.x + 38 * scale, fire.y + 15 * scale],
        [fire.x + 42 * scale, fire.y + 32 * scale, fire.x - 36 * scale, fire.y + 13 * scale]
    ];
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1d140e';
    ctx.lineWidth = 13 * scale;
    logs.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
    ctx.strokeStyle = `rgba(255,120,50,${0.55 * flicker})`;
    ctx.lineWidth = 2 * scale;
    logs.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1 + (x2 - x1) * 0.15, y1 + (y2 - y1) * 0.15 - 3 * scale);
        ctx.lineTo(x1 + (x2 - x1) * 0.8, y1 + (y2 - y1) * 0.8 - 3 * scale);
        ctx.stroke();
    });

    if (live) {
        const flameCount = Math.round(2 + 3 * intensity);
        for (let i = 0; i < flameCount; i++) {
            spawnFlame(lists, fire, scale);
        }
        // A wisp of smoke now and then, drawn soft and very faint
        if (Math.random() < 0.06) {
            lists.smoke.push({
                x: fire.x + (Math.random() - 0.5) * 12 * scale,
                y: fire.y - 34 * scale,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -(0.35 + Math.random() * 0.3),
                r: 14 * scale,
                grow: 0.22,
                life: 1,
                decay: 0.0045,
                t: Math.random() * 10,
                sway: 0.012,
                color: '150,138,126'
            });
        }
        // Embers leave the fire and drift up across the whole window, unless the screen asked for a calm room
        if (embers && Math.random() < 0.28 * intensity) {
            lists.embers.push({
                x: fire.x + (Math.random() - 0.5) * 30 * scale,
                y: fire.y - 10 * scale,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -(0.6 + Math.random() * 1.2),
                r: 0.7 + Math.random() * 1.4,
                life: 1,
                decay: 0.004 + Math.random() * 0.004,
                t: Math.random() * 100,
                sway: 0.02 + Math.random() * 0.03,
                color: pickColor()
            });
        }
    }

    // Smoke: each puff is a soft radial gradient so it has no hard edge
    for (let i = lists.smoke.length - 1; i >= 0; i--) {
        const puff = lists.smoke[i];
        if (live) {
            puff.t += puff.sway;
            puff.x += puff.vx + Math.sin(puff.t) * 0.3;
            puff.y += puff.vy;
            puff.r += puff.grow ?? 0;
            puff.life -= puff.decay;
        }
        if (puff.life <= 0) {
            lists.smoke.splice(i, 1);
            continue;
        }
        const alpha = Math.min(puff.life, 1 - puff.life) * 0.09; // fades in, then out
        const soft = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r);
        soft.addColorStop(0, `rgba(${puff.color},${alpha})`);
        soft.addColorStop(1, `rgba(${puff.color},0)`);
        ctx.fillStyle = soft;
        ctx.beginPath();
        ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFlames(ctx, lists, fire, live);
}

// Moves and draws one list of particles. Sparks are added together so they glow, ash is painted normally
function stepParticles(ctx: CanvasRenderingContext2D, list: Particle[], blend: GlobalCompositeOperation): void {
    ctx.globalCompositeOperation = blend;
    for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.t += p.sway;
        if (p.drag) {
            p.vx *= p.drag;
            p.vy *= p.drag;
        }
        p.vy += p.gravity ?? 0;
        p.x += p.vx + (p.sway ? Math.sin(p.t) * 0.35 : 0);
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0 || p.y < -20 || p.y > window.innerHeight + 40) {
            list.splice(i, 1); // splice from the end backwards so removing does not skip the next particle
            continue;
        }
        if (p.r > 1.7 && blend === 'lighter') {
            ctx.fillStyle = `rgba(${p.color},${p.life * 0.14})`; // a soft halo around the larger sparks
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = `rgba(${p.color},${p.life * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// A spark flying up and out from a point, slowing as it goes
function makeSpark(x: number, y: number, spread: number, speed: number): Particle {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread; // straight up, fanned out by the spread
    return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 0.965,
        gravity: -0.025, // hot air keeps lifting it
        r: 0.7 + Math.random() * 1.5,
        life: 1,
        decay: 0.014 + Math.random() * 0.02,
        t: 0,
        sway: 0,
        color: pickColor()
    };
}

// The shared SVG filters that turn ordinary borders into rough charcoal strokes
// The ids are referenced from CSS with filter: url(#hearth-rough)
function HearthFilters(): React.JSX.Element {
    return (
        <svg width="0" height="0" className={styles.filters} aria-hidden="true" focusable="false">
            <defs>
                {/* Turbulence makes a cloudy noise image, the displacement map then nudges every pixel of the border by that noise */}
                <filter id="hearth-rough" x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
                </filter>
                {/* A second, different stroke for the faint offset line that makes edges look sketched twice */}
                <filter id="hearth-rough-2" x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
                </filter>
                {/* The same idea in SVG units for the circle's rings, which are drawn in a 100 by 100 box */}
                <filter id="hearth-rough-svg">
                    <feTurbulence type="fractalNoise" baseFrequency="0.32" numOctaves="2" seed="5" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.6" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </defs>
        </svg>
    );
}

// Props for the provider: the dashboard it lights
interface HearthProviderProps {
    children: React.ReactNode;
}

// The fire layer for the whole dashboard: a canvas behind the interface for the room's glow, the fire and drifting embers,
// a canvas in front for sparks and ash from actions, and the charcoal filters. Components reach it through useHearth()
export default function HearthProvider({ children }: HearthProviderProps): React.JSX.Element {
    const skyRef = useRef<HTMLCanvasElement>(null);
    const fxRef = useRef<HTMLCanvasElement>(null);
    // Particles change every frame, so they live in a ref: changing a ref does not re-render React, changing state would, 60 times a second
    const particlesRef = useRef<ParticleLists>({ embers: [], flames: [], smoke: [], sparks: [], ash: [] });
    // How strongly the fire is flaring right now: flare() sets it to 1 and the drawing loop lets it fall back toward 0
    const boostRef = useRef<number>(0);
    const reducedMotion = usePrefersReducedMotion();

    // Starts the drawing loop once the canvases exist, and stops it when the dashboard closes
    useEffect(() => {
        const sky = skyRef.current;
        const fx = fxRef.current;
        const skyCtx = sky?.getContext('2d');
        const fxCtx = fx?.getContext('2d');
        if (!sky || !fx || !skyCtx || !fxCtx) {
            return;
        }
        const lists = particlesRef.current;
        const root = document.documentElement;
        let width = 0;
        let height = 0;

        // Matches the canvas pixels to the screen's pixel density so the fire stays sharp on high resolution screens
        const resize = (): void => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            width = window.innerWidth;
            height = window.innerHeight;
            [sky, fx].forEach((canvas) => {
                canvas.width = width * dpr;
                canvas.height = height * dpr;
            });
            skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        // Reduced motion: no loop at all. A still frame is redrawn a few times a second so the fire follows tab switches and resizing
        if (reducedMotion) {
            const drawStill = (): void => {
                skyCtx.clearRect(0, 0, width, height);
                fxCtx.clearRect(0, 0, width, height);
                const fire = findFire();
                drawRoomGlow(skyCtx, width, height, 1, fire ? 0.06 : 0.12);
                if (fire) {
                    // Runs the flames forward without drawing, so the still frame shows a fire mid flicker instead of an empty hearth
                    lists.flames.length = 0;
                    for (let i = 0; i < 45; i++) {
                        for (let j = 0; j < 5; j++) {
                            spawnFlame(lists, fire, fire.size / DESIGN_SIZE);
                        }
                        lists.flames.forEach((flame) => {
                            flame.x += flame.vx + ((flame.ax ?? fire.x) - flame.x) * 0.012;
                            flame.y += flame.vy;
                            flame.life -= flame.decay;
                        });
                    }
                    drawFire(skyCtx, lists, fire, 1, 1, false);
                }
            };
            drawStill();
            const timer = window.setInterval(drawStill, 400);
            return () => {
                window.clearInterval(timer);
                window.removeEventListener('resize', resize);
            };
        }

        // Embers rush up from the bottom as the dashboard opens, the same fire following you in from the landing page.
        // Skipped when the first screen is a calm one, which wants no small glowing particles over it
        const rushCount = isCalm() ? 0 : 100;
        for (let i = 0; i < rushCount; i++) {
            lists.sparks.push({
                x: Math.random() * width,
                y: height + Math.random() * 60,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -(3 + Math.random() * 6),
                drag: 0.985,
                gravity: -0.03, // a little lift, so they keep rising after the drag slows them instead of hanging in mid-air
                r: 0.8 + Math.random() * 2,
                life: 1,
                decay: 0.006 + Math.random() * 0.008,
                t: 0,
                sway: 0,
                color: pickColor()
            });
        }

        let intensity = 0.35; // eases toward its target so a kindling fire grows instead of jumping
        let frame = 0;
        let rafId = 0;

        // One frame of the room. requestAnimationFrame calls it before every screen refresh and pauses it while the tab is hidden
        const tick = (now: number): void => {
            rafId = requestAnimationFrame(tick);
            const seconds = now / 1000;
            // Three waves at unrelated speeds, so the flicker never visibly repeats
            const flicker = 1 + 0.07 * Math.sin(seconds * 2.3) + 0.05 * Math.sin(seconds * 5.7 + 1.3) + 0.03 * Math.sin(seconds * 12.1 + 0.4);
            if (frame++ % 3 === 0) {
                root.style.setProperty('--flick', flicker.toFixed(3)); // CSS glows read this, every third frame is enough for the eye
            }

            skyCtx.clearRect(0, 0, width, height);
            fxCtx.clearRect(0, 0, width, height);

            const fire = findFire();
            const calm = isCalm();
            intensity += ((fire?.kindling ? 0.35 : 1) - intensity) * 0.02;
            const boost = boostRef.current;
            boostRef.current *= 0.955; // a flare fades out over about a second
            drawRoomGlow(skyCtx, width, height, flicker, (fire ? 0.06 : 0.12) * (1 + boost * 0.8));
            if (fire) {
                drawFire(skyCtx, lists, fire, flicker, intensity, true, !calm, boost);
            }
            else {
                lists.flames.length = 0;
                lists.smoke.length = 0;
            }

            // A calm room clears the embers already in the air, so none are left floating over the screen that asked for calm
            if (calm) {
                lists.embers.length = 0;
            }

            // A slow drift of embers from below the window, on every screen that is not calm. Sparse, so it reads as embers and not as a pattern of dots
            if (!calm && Math.random() < 0.055) {
                lists.embers.push({
                    x: Math.random() * width,
                    y: height + 8,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: -(0.35 + Math.random() * 0.8),
                    r: 0.6 + Math.random() * 1.6,
                    life: 0.6 + Math.random() * 0.4,
                    decay: 0.0016 + Math.random() * 0.0022,
                    t: Math.random() * 100,
                    sway: 0.01 + Math.random() * 0.02,
                    color: pickColor()
                });
            }
            if (lists.embers.length > MAX_EMBERS) {
                lists.embers.splice(0, lists.embers.length - MAX_EMBERS);
            }

            stepParticles(skyCtx, lists.embers, 'lighter');
            stepParticles(fxCtx, lists.sparks, 'lighter');
            stepParticles(fxCtx, lists.ash, 'source-over');
        };
        rafId = requestAnimationFrame(tick);

        // Cleanup: stop the loop, stop listening, and empty the lists so a remount starts fresh
        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
            root.style.removeProperty('--flick');
            Object.values(lists).forEach((list: Particle[]) => {
                list.length = 0;
            });
        };
    }, [reducedMotion]);

    // The functions components call. useMemo keeps the same object between renders so components using it do not re-render for nothing
    const hearth = useMemo<HearthApi>(() => ({
        reducedMotion,
        flare: () => {
            if (!reducedMotion) {
                boostRef.current = 1; // the drawing loop reads this every frame
            }
        },
        burst: (x, y, count = 14, power = 1) => {
            if (reducedMotion) {
                return;
            }
            for (let i = 0; i < count; i++) {
                particlesRef.current.sparks.push(makeSpark(x, y, 1.7, (1.4 + Math.random() * 2.8) * power));
            }
        },
        emberArc: (toX, toY, count = 6) => {
            const fire = findFire();
            if (reducedMotion || !fire) {
                return;
            }
            // Thrown like a ball: a fixed flight time, a sideways speed that covers the gap in that time,
            // and an upward speed that gravity bends back down so the ember lands on the target
            const frames = 46;
            const gravity = 0.12;
            for (let i = 0; i < count; i++) {
                const startX = fire.x + (Math.random() - 0.5) * 16;
                const startY = fire.y - 12;
                const flight = frames + Math.round((Math.random() - 0.5) * 8);
                particlesRef.current.sparks.push({
                    x: startX,
                    y: startY,
                    vx: (toX - startX) / flight,
                    vy: (toY - startY - 0.5 * gravity * flight * flight) / flight,
                    gravity,
                    r: 1.3 + Math.random() * 1.1,
                    life: 1,
                    decay: 1 / (flight + 4),
                    t: 0,
                    sway: 0,
                    color: '255,190,120'
                });
            }
        },
        scorch: (rect) => {
            if (reducedMotion) {
                return;
            }
            const x = rect.left + Math.random() * rect.width;
            const y = rect.top + rect.height * (0.2 + Math.random() * 0.6);
            if (Math.random() < 0.55) {
                particlesRef.current.sparks.push(makeSpark(x, y, 1.2, 0.6 + Math.random() * 1.6));
            }
            if (Math.random() < 0.35) {
                // Ash drifts down and sideways instead of rising
                particlesRef.current.ash.push({
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: 0.2 + Math.random() * 0.4,
                    gravity: 0.025,
                    drag: 0.99,
                    r: 0.8 + Math.random() * 1.2,
                    life: 1,
                    decay: 0.012 + Math.random() * 0.01,
                    t: Math.random() * 10,
                    sway: 0.08,
                    color: '160,150,140'
                });
            }
        }
    }), [reducedMotion]);

    return (
        <HearthContext.Provider value={hearth}>
            <HearthFilters />
            {/* Behind the interface: the room's dark ground, its glow, the fire and the drifting embers */}
            <canvas ref={skyRef} className={styles.sky} aria-hidden="true" />
            {children}
            {/* In front of the interface: sparks and ash from actions. pointer-events: none lets clicks pass through */}
            <canvas ref={fxRef} className={styles.fx} aria-hidden="true" />
            <div className={styles.grain} aria-hidden="true" />
        </HearthContext.Provider>
    );
}
