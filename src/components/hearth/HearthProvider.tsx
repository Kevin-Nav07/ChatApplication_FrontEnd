import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HearthContext, type HearthApi } from './hearthContext';
import { FireSound } from './fireSound';
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

// The light of a fire somewhere below the window, warming every screen from its bottom edge
function drawRoomGlow(ctx: CanvasRenderingContext2D, width: number, height: number, flicker: number, strength: number): void {
    const glow = ctx.createRadialGradient(width / 2, height * 1.08, 10, width / 2, height * 1.08, Math.max(width, height) * 0.75);
    glow.addColorStop(0, `rgba(229,117,61,${strength * flicker})`);
    glow.addColorStop(0.45, `rgba(118,34,22,${strength * 0.35 * flicker})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
}

// The dark of the room beyond the fire's reach: clear near the fire, deepening toward the edges of the window.
// It is drawn on the background canvas only, so it darkens the room and never the words on top of it.
// depth is how dark the far corners get, higher while the fire is still being lit
function drawDarkness(ctx: CanvasRenderingContext2D, width: number, height: number, x: number, y: number, reach: number, depth: number): void {
    const dark = ctx.createRadialGradient(x, y, reach * 0.3, x, y, Math.max(width, height) * 1.1);
    dark.addColorStop(0, 'rgba(0,0,0,0)');
    dark.addColorStop(1, `rgba(2,1,1,${depth})`);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, width, height);
}

// Moves the fire that is drawn a little of the way toward the fire the page asks for, every frame.
// When a new page puts its fire somewhere else, the fire glides there instead of jumping. A change of shape snaps
function easeFire(shown: FirePlace | null, target: FirePlace | null): FirePlace | null {
    if (!target) {
        return null;
    }
    if (!shown || shown.shape !== target.shape) {
        return target;
    }
    const mix = (from: number, to: number): number => from + (to - from) * 0.12; // 12 percent of the gap per frame, about half a second in all
    return {
        ...target,
        x: mix(shown.x, target.x),
        y: mix(shown.y, target.y),
        size: mix(shown.size, target.size),
        left: mix(shown.left, target.left),
        width: mix(shown.width, target.width),
        bottom: mix(shown.bottom, target.bottom)
    };
}

// Where the fire's light comes from and how far it reaches, for the warm light laid over the interface
function lightSource(fire: FirePlace | null, width: number, height: number): { x: number; y: number; reach: number } {
    if (!fire) {
        return { x: width / 2, y: height * 1.15, reach: Math.max(width, height) * 0.7 }; // no fire on screen: a glow from somewhere below
    }
    return fire.shape === 'bed'
        ? { x: fire.x, y: fire.bottom, reach: fire.width * 0.75 }
        : { x: fire.x, y: fire.y, reach: fire.size * 1.1 };
}

// Moves and draws the smoke. Each puff is a soft radial gradient so it has no hard edge
function drawSmoke(ctx: CanvasRenderingContext2D, lists: ParticleLists, live: boolean): void {
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
        // Faint smoke lifts off the bed now and then and drifts up behind the conversation
        if (Math.random() < 0.05 * intensity) {
            lists.smoke.push({
                x: fire.left + fire.width * (0.2 + Math.random() * 0.6),
                y: fire.bottom - 40,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -(0.3 + Math.random() * 0.35),
                r: 20 + Math.random() * 16,
                grow: 0.3,
                life: 1,
                decay: 0.0035,
                t: Math.random() * 10,
                sway: 0.01,
                color: '150,138,126'
            });
        }
    }
    drawSmoke(ctx, lists, live);
    drawFlames(ctx, lists, fire, live);
}

// Draws the fire: the light it throws on the floor, two charred logs, smoke, and the flames
// live is false when motion is reduced, then the particles are drawn where they are without moving.
// The fire throws no embers into the window: small glowing points floating over the interface read as decoration, not fire
function drawFire(ctx: CanvasRenderingContext2D, lists: ParticleLists, fire: FirePlace, flicker: number, intensity: number, live: boolean, boost = 0): void {
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
    }

    drawSmoke(ctx, lists, live);
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

const IGNITE_MS = 2400; // how long the fire takes to catch when the app first opens
const SOUND_KEY = 'ember-fire-sound'; // where the sound choice is remembered between visits

// Reads whether the user left the fire's sound on last time. Storage can throw in private windows, so a failure means off
function readSoundChoice(): boolean {
    try {
        return window.localStorage.getItem(SOUND_KEY) === 'on';
    }
    catch {
        return false;
    }
}

// The fire for the whole app. It sits above the router, so one fire stays lit from the landing page through login
// and into the dashboard, gliding to wherever each page wants it. It owns a canvas behind the interface (the room's glow
// and darkness, the fire and its smoke), a canvas in front (sparks and ash from actions), a layer of warm
// light over the interface, the charcoal filters and the fire's sound. Components reach it through useHearth()
export default function HearthProvider({ children }: HearthProviderProps): React.JSX.Element {
    const skyRef = useRef<HTMLCanvasElement>(null);
    const fxRef = useRef<HTMLCanvasElement>(null);
    const lightRef = useRef<HTMLDivElement>(null);
    // Particles change every frame, so they live in a ref: changing a ref does not re-render React, changing state would, 60 times a second
    const particlesRef = useRef<ParticleLists>({ flames: [], smoke: [], sparks: [], ash: [] });
    // How strongly the fire is flaring right now: flare() sets it to 1 and the drawing loop lets it fall back toward 0
    const boostRef = useRef<number>(0);
    // The sound engine, created once after mount and kept for the life of the app
    const soundRef = useRef<FireSound | null>(null);
    const [soundOn, setSoundOn] = useState<boolean>(readSoundChoice);
    const reducedMotion = usePrefersReducedMotion();

    // Creates the sound engine once, and closes it if the app is torn down
    useEffect(() => {
        const sound = new FireSound();
        soundRef.current = sound;
        return () => {
            sound.dispose();
            soundRef.current = null;
        };
    }, []);

    // Starts or stops the sound when the choice changes, and remembers it.
    // Browsers block audio until the user has clicked or typed, so when the sound was left on last visit
    // it starts on the first click or key press anywhere
    useEffect(() => {
        try {
            window.localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
        }
        catch {
            // nothing to do: the choice just will not be remembered
        }
        const sound = soundRef.current;
        if (!sound) {
            return;
        }
        if (!soundOn) {
            sound.stop();
            return;
        }
        sound.start();
        const wake = (): void => sound.start();
        window.addEventListener('pointerdown', wake, { once: true });
        window.addEventListener('keydown', wake, { once: true });
        // The tab going into the background pauses the fire, coming back resumes it
        const onVisibility = (): void => sound.setHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pointerdown', wake);
            window.removeEventListener('keydown', wake);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [soundOn]);

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
        const light = lightRef.current;
        let width = 0;
        let height = 0;

        // Points the warm light layer at the fire. strength is its opacity, so it can follow the flicker
        const placeLight = (fire: FirePlace | null, strength: number): void => {
            if (!light) {
                return;
            }
            const source = lightSource(fire, width, height);
            light.style.setProperty('--fx', `${source.x.toFixed(0)}px`);
            light.style.setProperty('--fy', `${source.y.toFixed(0)}px`);
            light.style.setProperty('--fr', `${source.reach.toFixed(0)}px`);
            light.style.opacity = strength.toFixed(3);
        };

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
                const source = lightSource(fire, width, height);
                drawDarkness(skyCtx, width, height, source.x, source.y, source.reach, 0.55);
                placeLight(fire, 0.85);
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

        let intensity = 0; // eases toward its target so the fire grows instead of jumping, starting from nothing on first load
        let shown: FirePlace | null = null; // the fire as drawn, which glides toward where the page wants it
        const startedAt = performance.now(); // the same clock requestAnimationFrame passes to tick, for the ignition
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

            shown = easeFire(shown, findFire());
            const fire = shown;
            // The fire catches over the first couple of seconds. smoothstep (t * t * (3 - 2t)) starts and ends gently
            const t = Math.min(1, (now - startedAt) / IGNITE_MS);
            const lit = t * t * (3 - 2 * t);
            intensity += ((fire?.kindling ? 0.35 : 1) * lit - intensity) * 0.02;
            const boost = boostRef.current;
            boostRef.current *= 0.955; // a flare fades out over about a second
            drawRoomGlow(skyCtx, width, height, flicker, (fire ? 0.06 : 0.12) * (1 + boost * 0.8) * lit);
            const source = lightSource(fire, width, height);
            drawDarkness(skyCtx, width, height, source.x, source.y, source.reach, 0.55 + 0.4 * (1 - lit)); // the room starts nearly black
            if (frame % 2 === 0) {
                // The light on the interface breathes with the flames and swells when the fire flares
                placeLight(fire, Math.min(1, (0.72 + (flicker - 1) * 2.2) * lit * (1 + boost * 0.6)));
            }
            if (fire) {
                drawFire(skyCtx, lists, fire, flicker, intensity, true, boost);
            }
            else {
                lists.flames.length = 0;
                lists.smoke.length = 0;
            }

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
            soundRef.current?.burst(); // a flare is heard as well as seen, when the sound is on
        },
        soundOn,
        toggleSound: () => setSoundOn((on) => !on),
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
    }), [reducedMotion, soundOn]);

    return (
        <HearthContext.Provider value={hearth}>
            <HearthFilters />
            {/* Behind the interface: the room's dark ground, its glow and darkness, the fire and its smoke */}
            <canvas ref={skyRef} className={styles.sky} aria-hidden="true" />
            {children}
            {/* Over the interface: warm light from wherever the fire is, flickering with it */}
            <div ref={lightRef} className={styles.firelight} aria-hidden="true" />
            {/* In front of the interface: sparks and ash from actions. pointer-events: none lets clicks pass through */}
            <canvas ref={fxRef} className={styles.fx} aria-hidden="true" />
            <div className={styles.grain} aria-hidden="true" />
        </HearthContext.Provider>
    );
}
