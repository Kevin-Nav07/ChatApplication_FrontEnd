import React, { useEffect, useRef } from "react";
import styles from "./styles/HomePage.module.css";
import fireEmblem from "../assets/fireEmblem.png";

// Living Canvas-based Campfire Ember simulation
const CampfireCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", handleResize);

        interface EmberParticle {
            x: number;
            y: number;
            radius: number;
            color: string;
            alpha: number;
            decay: number;
            vx: number;
            vy: number;
            oscillationSpeed: number;
            oscillationDistance: number;
            t: number;
        }

        const embers: EmberParticle[] = [];
        const maxEmbers = 60;
        const colors = [
            "229, 117, 61", // #e5753d
            "215, 130, 75",
            "178, 69, 26",  // #b2451a
            "240, 190, 140",
            "118, 34, 22",  // #762216
        ];

        const createEmber = (initialSpawn = false): EmberParticle => {
            const originX = width * 0.5 + (Math.random() - 0.5) * (width * 0.55);
            const originY = height + Math.random() * 20;

            return {
                x: initialSpawn ? Math.random() * width : originX,
                y: initialSpawn ? Math.random() * height : originY,
                radius: Math.random() * 2.2 + 0.8,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: Math.random() * 0.75 + 0.15,
                decay: Math.random() * 0.0025 + 0.0015,
                vx: (Math.random() - 0.5) * 0.6,
                vy: -(Math.random() * 1.3 + 0.6),
                oscillationSpeed: Math.random() * 0.025 + 0.01,
                oscillationDistance: Math.random() * 1.2 + 0.4,
                t: Math.random() * 100,
            };
        };

        for (let i = 0; i < maxEmbers; i++) {
            embers.push(createEmber(true));
        }

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Natural warm hearth gradient at the base
            const gradient = ctx.createRadialGradient(
                width * 0.5,
                height * 0.95,
                10,
                width * 0.5,
                height * 0.8,
                width * 0.6
            );
            gradient.addColorStop(0, "rgba(229, 117, 61, 0.16)");
            gradient.addColorStop(0.5, "rgba(118, 34, 22, 0.05)");
            gradient.addColorStop(1, "rgba(26, 25, 11, 0)");

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            embers.forEach((ember, index) => {
                ember.t += ember.oscillationSpeed;
                ember.x += ember.vx + Math.sin(ember.t) * ember.oscillationDistance * 0.35;
                ember.y += ember.vy;
                ember.alpha -= ember.decay;

                if (ember.alpha <= 0 || ember.y < -10) {
                    embers[index] = createEmber(false);
                    return;
                }

                ctx.save();
                ctx.beginPath();
                ctx.arc(ember.x, ember.y, ember.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${ember.color}, ${ember.alpha})`;
                ctx.fill();
                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className={styles.ambientCanvas} />;
};

export default function HomePage(): React.JSX.Element {
    return (
        <div className={styles.heroViewport}>
            {/* Ambient Campfire Simulation */}
            <CampfireCanvas />
            <div className={styles.forestVignette} />



            {/* Main Center Composition */}
            <main className={styles.heroShowcase}>
                <div className={styles.heroTextBlock}>
                    <h1 className={styles.mainTitle}>ember</h1>

                    <p className={styles.heroSubheading}>
                        A warm space for real-time conversations. Connect with friends and communities around the hearth.
                    </p>

                    <div className={styles.heroActionRow}>
                        <button className={styles.mainCtaButton}>
                            <span>Start chatting</span>
                            <span className={styles.ctaArrow}>&rarr;</span>
                        </button>
                    </div>
                </div>

                {/* Right Side: Clean Flame Emblem without artificial halos */}
                <div className={styles.heroVisualBlock}>
                    <div className={styles.emblemWrapper}>
                        <img
                            src={fireEmblem}
                            alt="Ember Emblem"
                            className={styles.fireEmblemImg}
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                            }}
                        />
                    </div>
                </div>
            </main>

            {/* Minimalist Bottom Bar */}
            <footer className={styles.bottomBar}>
                <span className={styles.bottomMeta}>around the hearth • real-time messaging</span>
            </footer>
        </div>
    );
}
