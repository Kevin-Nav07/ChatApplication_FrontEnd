// The sound of the fire, made in the browser with the Web Audio API, so there is no audio file to download.
// Two layers: a low rumble (noise with the high frequencies filtered out) and crackles (very short bursts of noise
// passed through a band filter, each fading in a few milliseconds). Random timing between crackles is what makes it sound real

const ROAR_LEVEL = 0.16; // how loud the rumble is under the crackles
const MASTER_LEVEL = 0.55; // overall volume, kept low: a fire in the background, not in your ear

export class FireSound {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private roar: GainNode | null = null;
    private noise: AudioBuffer | null = null;
    private timer = 0;
    private running = false;

    // Builds the audio graph the first time it is needed. Browsers only allow audio to start after a click or key press,
    // so this is called from the sound toggle, or resumed on the first click if the user had it on last time
    private ensureGraph(): AudioContext {
        if (this.ctx) {
            return this.ctx;
        }
        const ctx = new AudioContext();
        // Two seconds of white noise (random values between -1 and 1), reused by every sound below
        const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const master = ctx.createGain(); // every sound passes through this, so one value fades the whole fire in or out
        master.gain.value = 0;
        master.connect(ctx.destination);

        // The rumble: looping noise through a low pass filter, which keeps only the deep frequencies
        const roarSource = ctx.createBufferSource();
        roarSource.buffer = noise;
        roarSource.loop = true;
        const lowPass = ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 340;
        const roar = ctx.createGain();
        roar.gain.value = ROAR_LEVEL;
        roarSource.connect(lowPass).connect(roar).connect(master);
        roarSource.start();

        this.ctx = ctx;
        this.master = master;
        this.roar = roar;
        this.noise = noise;
        return ctx;
    }

    // One crackle: a sliver of noise, filtered to a random pitch band, with a fast fade. Low pitch and longer means a pop
    private crackle(strength: number, pop = false): void {
        const ctx = this.ctx;
        if (!ctx || !this.master || !this.noise) {
            return;
        }
        const now = ctx.currentTime;
        const length = pop ? 0.05 + Math.random() * 0.05 : 0.004 + Math.random() * 0.02;
        const source = ctx.createBufferSource();
        source.buffer = this.noise;
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = pop ? 280 + Math.random() * 420 : 1400 + Math.random() * 4200;
        band.Q.value = pop ? 1.4 : 0.9;
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(strength, now);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + length * 3); // exponential sounds natural, a straight line sounds like a click
        source.connect(band).connect(envelope).connect(this.master);
        source.start(now, Math.random() * 1.8, length * 3); // a random offset into the noise, so no two crackles are the same
    }

    // Plans the next crackle. Squaring a random number makes short gaps common and long gaps rare, which is how fire sounds
    private scheduleNext(): void {
        if (!this.running) {
            return;
        }
        const gap = 35 + Math.random() * Math.random() * 420;
        this.timer = window.setTimeout(() => {
            const strength = 0.04 + Math.pow(Math.random(), 3) * 0.5; // mostly soft, now and then a loud one
            this.crackle(strength, Math.random() < 0.05);
            if (Math.random() < 0.12) {
                // A short cluster, like sap catching
                for (let i = 1; i < 2 + Math.random() * 4; i++) {
                    window.setTimeout(() => this.crackle(strength * 0.6), i * (12 + Math.random() * 30));
                }
            }
            // The rumble breathes a little louder and softer over time
            if (this.ctx && this.roar) {
                this.roar.gain.setTargetAtTime(ROAR_LEVEL * (0.75 + Math.random() * 0.5), this.ctx.currentTime, 0.4);
            }
            this.scheduleNext();
        }, gap);
    }

    // Fades the fire in. Safe to call more than once
    start(): void {
        const ctx = this.ensureGraph();
        void ctx.resume(); // resume returns a promise; void marks that nothing needs to wait for it
        this.master?.gain.setTargetAtTime(MASTER_LEVEL, ctx.currentTime, 0.8); // setTargetAtTime glides toward the value
        if (!this.running) {
            this.running = true;
            this.scheduleNext();
        }
    }

    // Fades the fire out, then pauses the audio engine so it uses no processor time
    stop(): void {
        this.running = false;
        window.clearTimeout(this.timer);
        const ctx = this.ctx;
        if (!ctx || !this.master) {
            return;
        }
        this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
        window.setTimeout(() => {
            if (!this.running) {
                void ctx.suspend();
            }
        }, 1200);
    }

    // Pauses or resumes with the browser tab, without changing whether the sound is switched on
    setHidden(hidden: boolean): void {
        if (!this.ctx || !this.running) {
            return;
        }
        void (hidden ? this.ctx.suspend() : this.ctx.resume());
    }

    // A handful of loud crackles, for when the fire flares
    burst(): void {
        if (!this.running) {
            return;
        }
        for (let i = 0; i < 4 + Math.random() * 4; i++) {
            window.setTimeout(() => this.crackle(0.18 + Math.random() * 0.3, i === 0), i * (20 + Math.random() * 60));
        }
    }

    // Closes the audio engine for good, when the app is torn down
    dispose(): void {
        this.stop();
        void this.ctx?.close();
        this.ctx = null;
    }
}
