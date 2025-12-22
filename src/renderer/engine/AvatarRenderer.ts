import { FaceState } from './FaceTracker';
import { Viseme, VisemeState } from './VisemeEngine';

/**
 * Munna Monitor - A playful, tech-savvy 2D doodle avatar
 * Wisdom in pixels, with a little confusion 😄
 */
export interface AvatarConfig {
    colors: {
        skin: string;
        hair: string;
        shirt: string;
        glassesFrame: string;
        glassesLens: string;
        headphones: string;
        eyeWhite: string;
        eyePupil: string;
        mouth: string;
        eyebrow: string;
    };
    style: {
        faceShape: 'oval' | 'round' | 'square';
        hairStyle: 'quiff' | 'messy' | 'bald';
        glasses: 'tech' | 'round' | 'none';
        headphones: 'over-ear' | 'none';
        eyeShape: 'sharp' | 'round';
    };
}

// ... existing imports ...

export class AvatarRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private state: any = {
        rotation: { x: 0, y: 0, z: 0 },
        mouth: { openness: 0, shape: 'closed' },
        eyes: { leftOpen: 1, rightOpen: 1, blink: false },
        position: { x: 0.5, y: 0.5 },
        viseme: null
    };

    private smoothState: FaceState = { ...this.state };
    private frameCount = 0;
    private lastTime = performance.now();
    private fps = 0;
    private animationTime = 0;

    // Export settings
    private targetResolution = { width: 1920, height: 1080 };
    private aspectRatio = '16:9';
    private backgroundStyle = 'gradient';

    // Dynamic Configuration
    public config: AvatarConfig = {
        colors: {
            skin: '#f3d6b9',
            hair: '#2d3436',
            shirt: '#6c5ce7',
            glassesFrame: '#2d3436',
            glassesLens: 'rgba(255, 255, 255, 0.1)',
            headphones: '#e17055', // Stylish Orange/Salmon
            eyeWhite: '#FFFFFF',
            eyePupil: '#2d3436',
            mouth: '#c08a79',
            eyebrow: '#2d3436',
        },
        style: {
            faceShape: 'oval',
            hairStyle: 'quiff',
            glasses: 'tech',
            headphones: 'none',
            eyeShape: 'sharp'
        }
    };

    // Helper for easier refactoring
    private get colors() { return this.config.colors; }

    // Helper for styles
    private get style() { return this.config.style; }

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.resize();
        window.addEventListener('resize', this.resize.bind(this));
        this.startLoop();
    }

    private resize() {
        // Use configured resolution
        this.canvas.width = this.targetResolution.width;
        this.canvas.height = this.targetResolution.height;

        // Ensure CSS scales it to fit window
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.objectFit = 'contain';
    }

    setResolution(width: number, height: number) {
        this.targetResolution = { width, height };
        this.resize();
    }

    setAspectRatio(ratio: string) {
        this.aspectRatio = ratio;
        const [w, h] = ratio.split(':').map(Number);
        const baseHeight = this.targetResolution.height;
        this.targetResolution.width = Math.round((baseHeight * w) / h);
        this.resize();
    }

    setBackground(style: string) {
        this.backgroundStyle = style;
    }

    updateState(newState: FaceState) {
        this.state = newState;
    }

    // Backwards compatibility (no-op for this character)
    setCustomization() { }
    setDetailedCustomization() { }

    private startLoop() {
        requestAnimationFrame(this.loop.bind(this));
    }

    private loop() {
        this.frameCount++;
        this.animationTime += 0.016;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;

            const fpsEl = document.getElementById('fps');
            if (fpsEl) fpsEl.textContent = `FPS: ${this.fps}`;
        }

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const smoothFactor = 0.15; // Smooth but responsive

        this.smoothState.rotation.x = lerp(this.smoothState.rotation.x, this.state.rotation.x, smoothFactor);
        this.smoothState.rotation.y = lerp(this.smoothState.rotation.y, -this.state.rotation.y, smoothFactor);
        this.smoothState.rotation.z = lerp(this.smoothState.rotation.z, -this.state.rotation.z, smoothFactor);
        this.smoothState.mouth.openness = lerp(this.smoothState.mouth.openness, this.state.mouth.openness, 0.3);
        this.smoothState.eyes.leftOpen = lerp(this.smoothState.eyes.leftOpen, this.state.eyes.leftOpen, 0.2);
        this.smoothState.eyes.rightOpen = lerp(this.smoothState.eyes.rightOpen, this.state.eyes.rightOpen, 0.2);

        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }

    private draw() {
        const { width, height } = this.canvas;
        const { rotation, mouth, eyes, eyebrows } = this.smoothState;

        // Configurable background with smooth gradients (fixes banding)
        switch (this.backgroundStyle) {
            case 'gradient':
                // Improved gradient with more color stops for smoother transitions
                const bgGradient = this.ctx.createRadialGradient(
                    width / 2, height / 2, 0,
                    width / 2, height / 2, Math.max(width, height) * 0.7
                );
                bgGradient.addColorStop(0, '#4a3f6a');
                bgGradient.addColorStop(0.3, '#3a2f5a');
                bgGradient.addColorStop(0.5, '#2f2448');
                bgGradient.addColorStop(0.7, '#1f1833');
                bgGradient.addColorStop(0.85, '#15102a');
                bgGradient.addColorStop(1, '#0f0a1a');
                this.ctx.fillStyle = bgGradient;
                break;
            case 'solid-dark':
                this.ctx.fillStyle = '#1a1a2e';
                break;
            case 'solid-light':
                this.ctx.fillStyle = '#f5f5f5';
                break;
            case 'green':
                this.ctx.fillStyle = '#00ff00'; // Chroma key green
                break;
            case 'blue':
                this.ctx.fillStyle = '#0000ff'; // Chroma key blue
                break;
            default:
                this.ctx.fillStyle = '#1a1a2e';
        }
        this.ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const scale = Math.min(width, height) / 700;

        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.scale(scale, scale);
        // Reduced tilt for more confident look
        this.ctx.rotate(rotation.z * 0.2);

        const moveX = rotation.y * 45;
        const moveY = rotation.x * 35;
        this.ctx.translate(moveX, moveY);

        // Shadow
        this.drawShadow();

        // Neck
        this.drawNeck();

        // Head (Oval, Sharp Jaw)
        this.drawHead();

        // Hair (Textured Quiff - Rear Layers)
        // Note: Hair mostly drawn on top but sideburns might need care
        // For now drawHair handles it all on top

        const eyeOffsetX = rotation.y * 18;
        const eyeOffsetY = rotation.x * 12;

        // Face Features Layering

        // Ears (only if not covered by big headphones)
        if (this.style.headphones !== 'over-ear') {
            this.drawEars();
        }

        // Headphones (Ear Cups Layer)
        if (this.style.headphones !== 'none') {
            this.drawHeadphones(rotation, eyeOffsetY);
        }

        // Hair (Textured Quiff)
        this.drawHair(rotation);

        // Eyes (Sharp, Alert)
        this.drawEyes(eyeOffsetX, eyeOffsetY, eyes, rotation);

        // Eyebrows (Expressive)
        this.drawEyebrows(eyeOffsetX, eyeOffsetY, eyebrows);

        // Glasses (Conditional)
        if (this.style.glasses !== 'none') {
            this.drawGlasses(eyeOffsetX, eyeOffsetY);
        }

        // Nose (Angular)
        this.drawNose(eyeOffsetX, eyeOffsetY);

        // Mouth (viseme-based lip sync)
        const visemeState = (this.smoothState as any).viseme;
        if (visemeState) {
            this.drawVisemeMouth(eyeOffsetX, eyeOffsetY, visemeState);
        } else {
            // Fallback to simple mouth
            this.drawMouth(eyeOffsetX, eyeOffsetY, mouth.openness);
        }

        this.ctx.restore();
    }

    private drawShadow() {
        this.ctx.save();
        const shadowGradient = this.ctx.createRadialGradient(8, 210, 0, 8, 210, 120);
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = shadowGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(8, 210, 120, 25, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    private drawNeck() {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.skin;
        this.ctx.strokeStyle = this.colors.hair;
        this.ctx.lineWidth = 3;
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(-35, 130);
        this.ctx.lineTo(-35, 200);
        this.ctx.lineTo(35, 200);
        this.ctx.lineTo(35, 130);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawHead() {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.skin;
        this.ctx.strokeStyle = '#e0c0a0'; // Subtle outline
        this.ctx.lineWidth = 2;
        this.ctx.lineJoin = 'round';

        // Jawline movement based on head rotation
        const jawOffset = (this.smoothState.rotation?.y || 0) * 10;

        this.ctx.beginPath();
        // Chin
        this.ctx.moveTo(0 + jawOffset, 140);

        // Right Jaw
        this.ctx.quadraticCurveTo(80 + jawOffset, 120, 95 + jawOffset, 0);
        // Right Temple (straight up for oval shape)
        this.ctx.lineTo(95 + jawOffset, -80);

        // Forehead (Rounded)
        this.ctx.quadraticCurveTo(0 + jawOffset, -130, -95 + jawOffset, -80);

        // Left Temple
        this.ctx.lineTo(-95 + jawOffset, 0);

        // Left Jaw
        this.ctx.quadraticCurveTo(-80 + jawOffset, 120, 0 + jawOffset, 140);

        this.ctx.fill();
        this.ctx.stroke();

        // Ears (simple)
        this.ctx.fillStyle = this.colors.skin;
        this.ctx.beginPath();
        this.ctx.ellipse(-100 + jawOffset, 0, 15, 25, 0, 0, Math.PI * 2); // Left
        this.ctx.ellipse(100 + jawOffset, 0, 15, 25, 0, 0, Math.PI * 2); // Right
        this.ctx.fill();

        this.ctx.restore();
    }

    private drawHair(rotation: { x: number; y: number; z: number }) {
        if (this.style.hairStyle === 'bald') return;

        this.ctx.save();
        this.ctx.fillStyle = this.colors.hair;
        const offset = rotation.y * 12;
        const bounce = Math.sin(this.animationTime * 2) * 2;

        if (this.style.hairStyle === 'quiff') {
            // Modern Quiff (Default)
            this.ctx.beginPath();
            this.ctx.moveTo(-98 + offset, -30);
            this.ctx.quadraticCurveTo(-110 + offset, -100, -60 + offset, -160 + bounce);
            this.ctx.quadraticCurveTo(0 + offset, -180 + bounce, 80 + offset, -150 + bounce);
            this.ctx.quadraticCurveTo(120 + offset, -100, 102 + offset, -30);
            this.ctx.quadraticCurveTo(0 + offset, -60, -98 + offset, -30);
            this.ctx.fill();

            // Texture
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(-60 + offset, -130);
            this.ctx.quadraticCurveTo(0 + offset, -150, 60 + offset, -130);
            this.ctx.stroke();

        } else if (this.style.hairStyle === 'messy') {
            // Messy / Bedhead
            this.ctx.beginPath();
            this.ctx.moveTo(-95 + offset, -30);
            // Spikes
            this.ctx.lineTo(-110 + offset, -90);
            this.ctx.lineTo(-80 + offset, -130 + bounce);
            this.ctx.lineTo(-40 + offset, -150 + bounce);
            this.ctx.lineTo(0 + offset, -160 + bounce); // Top spike
            this.ctx.lineTo(40 + offset, -145 + bounce);
            this.ctx.lineTo(90 + offset, -120);
            this.ctx.lineTo(105 + offset, -40);
            this.ctx.quadraticCurveTo(0 + offset, -65, -95 + offset, -30);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    private drawEars() {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.skin;
        this.ctx.strokeStyle = this.colors.hair;
        this.ctx.lineWidth = 3;

        // Left ear
        this.ctx.beginPath();
        this.ctx.ellipse(-130, 0, 20, 28, -0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Inner ear
        this.ctx.beginPath();
        this.ctx.arc(-125, 0, 8, 0, Math.PI * 2);
        this.ctx.stroke();

        // Right ear
        this.ctx.beginPath();
        this.ctx.ellipse(130, 0, 20, 28, 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Inner ear
        this.ctx.beginPath();
        this.ctx.arc(125, 0, 8, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    private drawEyes(offsetX: number, offsetY: number, eyes: any, rotation: any) {
        const eyeSpacing = 45;
        const eyeY = -15 + offsetY;

        this.drawSingleEye(-eyeSpacing + offsetX, eyeY, eyes.leftOpen, eyes.blink, rotation);
        this.drawSingleEye(eyeSpacing + offsetX, eyeY, eyes.rightOpen, eyes.blink, rotation);
    }

    private drawSingleEye(x: number, y: number, openness: number, blink: boolean, rotation: any) {
        this.ctx.save();

        // Medium sized, sharp eyes
        const eyeWidth = 32;
        const eyeHeightBase = 26; // Slightly almond aka slightly flattened

        if (blink || openness < 0.20) { // Higher threshold for more responsiveness
            // Clean blink stroke
            this.ctx.strokeStyle = this.colors.eyebrow; // Match brow color
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(x - eyeWidth * 0.9, y + 2);
            this.ctx.quadraticCurveTo(x, y + 8, x + eyeWidth * 0.9, y + 2);
            this.ctx.stroke();
        } else {
            // Eye shape (Almond / Alert)
            this.ctx.fillStyle = this.colors.eyeWhite;
            this.ctx.strokeStyle = '#d0b090'; // Subtle skin outline
            this.ctx.lineWidth = 2;

            const currentHeight = eyeHeightBase * Math.min(openness * 1.5, 1);

            this.ctx.beginPath();
            this.ctx.ellipse(x, y, eyeWidth, currentHeight, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Pupil (Sharp, Focused)
            // Movement tracking
            let pupilX = x + rotation.y * 12; // More responsive looking
            let pupilY = y + rotation.x * 10;

            // Constrain pupil to eye
            const maxOffset = 10;
            const pdx = pupilX - x;
            const pdy = pupilY - y;
            const dist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (dist > maxOffset) {
                pupilX = x + (pdx / dist) * maxOffset;
                pupilY = y + (pdy / dist) * maxOffset;
            }

            const pupilSize = 10; // Smaller, alert pupil

            this.ctx.fillStyle = this.colors.eyePupil;
            this.ctx.beginPath();
            this.ctx.arc(pupilX, pupilY, pupilSize, 0, Math.PI * 2);
            this.ctx.fill();

            // Highlight (Smart/Sharp reflection)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.beginPath();
            this.ctx.arc(pupilX - 3, pupilY - 3, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    private drawGlasses(offsetX: number, offsetY: number) {
        this.ctx.save();
        this.ctx.strokeStyle = this.colors.glassesFrame;
        this.ctx.lineWidth = 3;
        this.ctx.lineJoin = 'round';
        this.ctx.fillStyle = this.colors.glassesLens;

        const frameWidth = 65;
        const frameHeight = 45;
        const bridgeWidth = 18;
        const y = -35 + offsetY;

        // Left Lens (Soft Rectangular)
        const lx = -frameWidth - bridgeWidth / 2 + offsetX;
        this.drawSoftRect(lx, y, frameWidth, frameHeight, 8);
        this.ctx.fill();
        this.ctx.stroke();

        // Right Lens
        const rx = bridgeWidth / 2 + offsetX;
        this.drawSoftRect(rx, y, frameWidth, frameHeight, 8);
        this.ctx.fill();
        this.ctx.stroke();

        // Bridge
        this.ctx.beginPath();
        this.ctx.moveTo(lx + frameWidth, y + frameHeight / 2 - 5);
        this.ctx.quadraticCurveTo(0 + offsetX, y + frameHeight / 2 - 12, rx, y + frameHeight / 2 - 5);
        this.ctx.stroke();

        // Screen Reflection (Tech Vibe)
        this.ctx.fillStyle = 'rgba(100, 200, 255, 0.15)';
        this.ctx.beginPath();
        this.ctx.moveTo(lx + 10, y + 10);
        this.ctx.lineTo(lx + 25, y + 10);
        this.ctx.lineTo(lx + 15, y + frameHeight - 10);
        this.ctx.lineTo(lx, y + frameHeight - 10);
        this.ctx.fill();

        this.ctx.restore();
    }

    private drawSoftRect(x: number, y: number, w: number, h: number, r: number) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
    }

    private drawEyebrows(offsetX: number, offsetY: number, eyebrows: { left: number; right: number } | undefined) {
        this.ctx.save();
        this.ctx.strokeStyle = this.colors.eyebrow;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';

        // Base positions
        const baseY = -55 + offsetY;
        const spacing = 25;
        const browWidth = 35;

        // Get raised amount from tracking
        const leftRaised = eyebrows ? eyebrows.left * 1.5 : 0;
        const rightRaised = eyebrows ? eyebrows.right * 1.5 : 0;

        // Left Brow (Sarcastic Arch potential)
        this.ctx.beginPath();
        this.ctx.moveTo(-spacing - browWidth + offsetX, baseY - leftRaised);
        // Arch point
        this.ctx.quadraticCurveTo(
            -spacing - browWidth / 2 + offsetX,
            baseY - 10 - leftRaised,
            -spacing + offsetX,
            baseY - leftRaised + 5
        );
        this.ctx.stroke();

        // Right Brow
        this.ctx.beginPath();
        this.ctx.moveTo(spacing + offsetX, baseY - rightRaised + 5);
        this.ctx.quadraticCurveTo(
            spacing + browWidth / 2 + offsetX,
            baseY - 10 - rightRaised,
            spacing + browWidth + offsetX,
            baseY - rightRaised
        );
        this.ctx.stroke();

        this.ctx.restore();
    }

    private drawNose(offsetX: number, offsetY: number) {
        this.ctx.save();
        this.ctx.strokeStyle = '#d0b090'; // More visible nose
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();
        // Angular simple nose
        this.ctx.moveTo(-5 + offsetX, 15 + offsetY);
        this.ctx.lineTo(0 + offsetX, 30 + offsetY);
        this.ctx.lineTo(12 + offsetX, 25 + offsetY);
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawHeadphones(rotation: { x: number; y: number; z: number }, offsetY: number) {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.headphones;
        this.ctx.strokeStyle = '#2d3436'; // Dark frame
        this.ctx.lineWidth = 3;

        const headWidth = 200; // Approx width of head
        const earOffset = 100;
        const rotOffset = rotation.y * 110; // Parallax for 3D effect

        // Headband (Arch)
        this.ctx.beginPath();
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = 12;
        this.ctx.strokeStyle = this.colors.headphones;
        // Arch goes from left ear to right ear over top of hair (-160y roughly)
        this.ctx.moveTo(-earOffset + rotOffset * 0.5, -40);
        this.ctx.bezierCurveTo(
            -earOffset + rotOffset * 0.5, -220,
            earOffset + rotOffset * 0.5, -220,
            earOffset + rotOffset * 0.5, -40
        );
        this.ctx.stroke();

        // Inner band padding (darker)
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.stroke();

        // Ear Cups (Large, Over-ear)
        const cupWidth = 35;
        const cupHeight = 60;

        // Left Cup
        this.drawEarCup(-earOffset + rotOffset, -10 + offsetY, cupWidth, cupHeight);

        // Right Cup
        this.drawEarCup(earOffset + rotOffset, -10 + offsetY, cupWidth, cupHeight);

        this.ctx.restore();
    }

    private drawEarCup(x: number, y: number, w: number, h: number) {
        this.ctx.save();
        this.ctx.translate(x, y);

        // Main cup
        this.ctx.fillStyle = this.colors.headphones;
        this.ctx.strokeStyle = '#2d3436';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Cushion (Ring)
        this.ctx.fillStyle = '#2d3436'; // Dark cushion
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, w * 0.7, h * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Tech Light/Logo (Accent)
        this.ctx.fillStyle = '#dfe6e9';
        this.ctx.beginPath();
        this.ctx.arc(0, -15, 6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    private drawVisemeMouth(offsetX: number, offsetY: number, visemeState: VisemeState) {
        const mouthY = 80 + offsetY;
        const intensity = visemeState.intensity;

        // Blend between current and previous viseme
        if (visemeState.transitionProgress < 1.0) {
            // Draw both and blend
            this.ctx.save();
            this.ctx.globalAlpha = 1.0 - visemeState.transitionProgress;
            this.drawSingleViseme(offsetX, mouthY, visemeState.previous, intensity);
            this.ctx.restore();

            this.ctx.save();
            this.ctx.globalAlpha = visemeState.transitionProgress;
            this.drawSingleViseme(offsetX, mouthY, visemeState.current, intensity);
            this.ctx.restore();
        } else {
            // Fully transitioned, draw current only
            this.drawSingleViseme(offsetX, mouthY, visemeState.current, intensity);
        }
    }

    /**
     * Draw individual viseme shape
     */
    private drawSingleViseme(x: number, y: number, viseme: Viseme, intensity: number) {
        this.ctx.save();
        this.ctx.strokeStyle = this.colors.mouth;
        this.ctx.fillStyle = this.colors.mouth;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';

        switch (viseme) {
            case Viseme.REST:
                this.drawVisemeRest(x, y);
                break;
            case Viseme.AA:
                this.drawVisemeAA(x, y, intensity);
                break;
            case Viseme.E:
                this.drawVisemeE(x, y, intensity);
                break;
            case Viseme.O:
                this.drawVisemeO(x, y, intensity);
                break;
            case Viseme.U:
                this.drawVisemeU(x, y, intensity);
                break;
            case Viseme.FV:
                this.drawVisemeFV(x, y, intensity);
                break;
            case Viseme.MBP:
                this.drawVisemeMBP(x, y, intensity);
                break;
        }

        this.ctx.restore();
    }

    // REST - lips closed, relaxed
    private drawVisemeRest(x: number, y: number) {
        this.ctx.beginPath();
        this.ctx.moveTo(x - 25, y);
        this.ctx.lineTo(x + 25, y);
        this.ctx.stroke();
    }

    // AA - a, ah - mouth wide open
    private drawVisemeAA(x: number, y: number, intensity: number) {
        const width = 28 + intensity * 10;
        const height = 20 + intensity * 25;

        this.ctx.fillStyle = '#3a2a2a';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 5, width, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Teeth
        if (intensity > 0.3) {
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(x - width + 5, y - height + 8);
            this.ctx.lineTo(x + width - 5, y - height + 8);
            this.ctx.stroke();
        }
    }

    // E - ee, ih - mouth stretched sideways
    private drawVisemeE(x: number, y: number, intensity: number) {
        const width = 30 + intensity * 8;
        const height = 8 + intensity * 5;

        this.ctx.fillStyle = '#3a2a2a';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Teeth visible
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - width + 8, y);
        this.ctx.lineTo(x + width - 8, y);
        this.ctx.stroke();
    }

    // O - oh - rounded lips
    private drawVisemeO(x: number, y: number, intensity: number) {
        const size = 18 + intensity * 8;

        this.ctx.fillStyle = '#3a2a2a';
        this.ctx.beginPath();
        this.ctx.arc(x, y + 2, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }

    // U - oo - small rounded opening
    private drawVisemeU(x: number, y: number, intensity: number) {
        const size = 12 + intensity * 6;

        this.ctx.fillStyle = '#3a2a2a';
        this.ctx.beginPath();
        this.ctx.arc(x, y + 2, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }

    // FV - f, v - teeth touch lower lip
    private drawVisemeFV(x: number, y: number, intensity: number) {
        // Upper teeth showing
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(x - 20, y - 8, 40, 6);

        // Lower lip
        this.ctx.strokeStyle = this.colors.mouth;
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 22, y + 2);
        this.ctx.quadraticCurveTo(x, y + 10, x + 22, y + 2);
        this.ctx.stroke();
    }

    // MBP - m, b, p - lips fully closed, pressed
    private drawVisemeMBP(x: number, y: number, intensity: number) {
        const pressure = intensity * 3;

        // Pressed together lip line (thicker)
        this.ctx.strokeStyle = this.colors.mouth;
        this.ctx.lineWidth = 6 + pressure;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 26, y);
        this.ctx.lineTo(x + 26, y);
        this.ctx.stroke();
    }

    // Fallback simple mouth (for when no viseme data)
    private drawMouth(offsetX: number, offsetY: number, openness: number) {
        this.ctx.save();

        const mouthY = 80 + offsetY;

        this.ctx.strokeStyle = this.colors.mouth;
        this.ctx.fillStyle = this.colors.mouth;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';

        if (openness < 0.08) {
            this.ctx.beginPath();
            this.ctx.moveTo(-25 + offsetX, mouthY);
            this.ctx.lineTo(25 + offsetX, mouthY);
            this.ctx.stroke();
        } else if (openness < 0.2) {
            this.ctx.beginPath();
            this.ctx.moveTo(-28 + offsetX, mouthY - 2);
            this.ctx.quadraticCurveTo(offsetX, mouthY + 8, 28 + offsetX, mouthY - 2);
            this.ctx.stroke();
        } else {
            this.ctx.fillStyle = '#3a2a2a';
            this.ctx.beginPath();
            const width = 30;
            const height = Math.min(openness * 50, 35);
            this.ctx.ellipse(offsetX, mouthY + 5, width, height, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            if (height > 15) {
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(offsetX - 18, mouthY - height + 8);
                this.ctx.lineTo(offsetX + 18, mouthY - height + 8);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    private adjustColor(color: string, amount: number): string {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
