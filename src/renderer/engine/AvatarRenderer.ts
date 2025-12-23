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
        viseme: null,
        emotion: 'neutral'
    };

    // Initialize smoothState with all required properties
    private smoothState: FaceState = {
        rotation: { x: 0, y: 0, z: 0 },
        mouth: { openness: 0, shape: 'closed' },
        eyes: { leftOpen: 1, rightOpen: 1, blink: false },
        position: { x: 0.5, y: 0.5 },
        emotion: 'neutral'
    };
    private frameCount = 0;
    private lastTime = performance.now();
    private fps = 0;
    private animationTime = 0;

    // Export settings
    private targetResolution = { width: 1920, height: 1080 };

    private backgroundStyle = 'gradient';

    // Dynamic Configuration
    public config: AvatarConfig = {
        colors: {
            skin: '#FFDFC4', // Warm light tone
            hair: '#333333', // Dark charcoal/brown
            shirt: '#3B3B98', // Tech blue shirt
            glassesFrame: '#1A1A2E', // Navy/Black
            glassesLens: 'rgba(255, 255, 255, 0.15)',
            headphones: '#FF6B6B',
            eyeWhite: '#FFFFFF',
            eyePupil: '#000000',
            mouth: '#4A4A4A', // Dark gray for outlines
            eyebrow: '#333333',
        },
        style: {
            faceShape: 'square', // Soft rounded square
            hairStyle: 'messy', // Tech messy
            glasses: 'tech',
            headphones: 'none',
            eyeShape: 'round'
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

        // Update emotion directly (discrete state)
        (this.smoothState as any).emotion = (this.state as any).emotion || 'neutral';
        // Also ensure eyebrows exist in state
        if (this.state.eyebrows) {
            // (this.smoothState as any).eyebrows = this.state.eyebrows; // We do this better below or usage in draw
            // Actually drawing uses passed eyebrows or accesses them. 
            // Currently smoothState doesn't interpolate eyebrows, drawEyebrows uses 'eyebrows' from somewhere?
        }
        // Actually draw method accesses 'this.smoothState.eyebrows' but we never updated it here?
        // Let's check draw(): const { rotation, mouth, eyes, eyebrows } = this.smoothState;
        // So we MUST update eyebrows in smoothState!
        if (this.state.eyebrows) {
            if (!(this.smoothState as any).eyebrows) (this.smoothState as any).eyebrows = { left: 0, right: 0 };
            (this.smoothState as any).eyebrows.left = lerp((this.smoothState as any).eyebrows?.left || 0, this.state.eyebrows.left, 0.2);
            (this.smoothState as any).eyebrows.right = lerp((this.smoothState as any).eyebrows?.right || 0, this.state.eyebrows.right, 0.2);
        }

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
        this.ctx.strokeStyle = '#2A2A2A'; // Dark gray outline
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = 'round';

        // Short tapered neck
        this.ctx.beginPath();
        this.ctx.moveTo(-30, 140); // Top Left
        this.ctx.lineTo(-25, 180); // Bottom Left (Tapered)
        this.ctx.quadraticCurveTo(0, 185, 25, 180); // Bottom Curve
        this.ctx.lineTo(30, 140); // Top Right
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Shadow under chin
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(-30, 140);
        this.ctx.quadraticCurveTo(0, 160, 30, 140);
        this.ctx.fill();

        this.ctx.restore();
    }

    private drawHead() {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.skin;
        this.ctx.strokeStyle = '#2A2A2A';
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = 'round';

        // Face Shape: Rounded Rectangle / Soft Oval
        // W: 190, H: 240 (proportions)

        const jawOffset = (this.smoothState.rotation?.y || 0) * 12;

        this.ctx.beginPath();
        // Start top-left
        this.ctx.moveTo(-85 + jawOffset, -100);

        // Top curve (Forehead)
        this.ctx.quadraticCurveTo(jawOffset, -125, 85 + jawOffset, -100);

        // Right side
        this.ctx.lineTo(90 + jawOffset, 100);

        // Chin/Jaw (Smooth, rounded)
        this.ctx.quadraticCurveTo(90 + jawOffset, 145, 0 + jawOffset, 145); // Bottom Right to Bottom Center
        this.ctx.quadraticCurveTo(-90 + jawOffset, 145, -90 + jawOffset, 100); // Bottom Center to Bottom Left

        // Left side
        this.ctx.lineTo(-85 + jawOffset, -100);

        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();

        // Ears are drawn separately, behind or in front? Spec says "Proportional". 
        // Logic invokes drawEars() separately in draw() loop which is fine.
    }

    private drawHair(rotation: { x: number; y: number; z: number }) {
        if (this.style.hairStyle === 'bald') return;

        this.ctx.save();
        this.ctx.fillStyle = this.colors.hair;
        this.ctx.strokeStyle = '#2A2A2A'; // Outline
        this.ctx.lineWidth = 4;

        const offset = rotation.y * 14; // Hair moves a bit more
        const bounce = Math.sin(this.animationTime * 3) * 3;

        this.ctx.beginPath();

        // Hair Base (covers forehead)
        this.ctx.moveTo(-95 + offset, -40); // Left temple

        // Chunk 1 (Left Volume)
        this.ctx.quadraticCurveTo(-110 + offset, -100, -60 + offset, -150 + bounce);

        // Chunk 2 (Top Center - The Volume)
        this.ctx.quadraticCurveTo(0 + offset, -180 + bounce, 50 + offset, -155 + bounce);

        // Chunk 3 (Right Messy)
        this.ctx.quadraticCurveTo(100 + offset, -130, 105 + offset, -40); // Right temple

        // Hairline (Clean but stylish)
        this.ctx.quadraticCurveTo(50 + offset, -60, 0 + offset, -50 + bounce * 0.5); // Center dip
        this.ctx.quadraticCurveTo(-50 + offset, -60, -95 + offset, -40);

        this.ctx.fill();
        this.ctx.stroke();

        // Highlight (Soft band)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 6;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(-50 + offset, -120 + bounce);
        this.ctx.quadraticCurveTo(0 + offset, -140 + bounce, 50 + offset, -120 + bounce);
        this.ctx.stroke();

        this.ctx.restore();
    }

    private drawEars() {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.skin;
        this.ctx.strokeStyle = '#2A2A2A';
        this.ctx.lineWidth = 4;

        // Position: attached to the head sides (approx +/- 90)
        // Left ear
        this.ctx.beginPath();
        this.ctx.ellipse(-95, 0, 15, 22, -0.1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Inner left
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#d0b090'; // Subtle detail
        this.ctx.lineWidth = 2;
        this.ctx.arc(-95, 2, 8, Math.PI / 2, Math.PI * 1.5, true);
        this.ctx.stroke();

        // Right ear
        this.ctx.beginPath();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = '#2A2A2A';
        this.ctx.ellipse(95, 0, 15, 22, 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Inner right
        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#d0b090';
        this.ctx.arc(95, 2, 8, Math.PI * 1.5, Math.PI / 2, true);
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

        // Eyes: Medium-large, Circular/Soft Oval
        const eyeSize = 38; // Increased size

        if (blink || openness < 0.15) {
            // Blink: Simple downward curve
            this.ctx.strokeStyle = '#2A2A2A';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(x - 20, y + 5);
            this.ctx.quadraticCurveTo(x, y + 12, x + 20, y + 5);
            this.ctx.stroke();
        } else {
            // Eye Outline
            this.ctx.fillStyle = this.colors.eyeWhite;
            this.ctx.strokeStyle = '#2A2A2A';
            this.ctx.lineWidth = 3;

            // Height varies with openness
            const h = eyeSize * Math.min(openness * 1.2, 1);

            this.ctx.beginPath();
            this.ctx.ellipse(x, y, eyeSize * 0.9, h, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Eyelid crease (Slightly visible)
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            this.ctx.lineWidth = 2;
            this.ctx.arc(x, y - h + 5, 20, Math.PI * 1.1, Math.PI * 1.9);
            this.ctx.stroke();

            // Pupil: Black + White highlight
            // Responsive tracking
            const maxX = 12;
            const maxY = 8;
            const px = x + Math.max(-maxX, Math.min(maxX, rotation.y * 20));
            const py = y + Math.max(-maxY, Math.min(maxY, rotation.x * 15));

            // Pupil
            this.ctx.fillStyle = this.colors.eyePupil;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 12, 0, Math.PI * 2);
            this.ctx.fill();

            // Highlight (The "Life" dot)
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(px + 4, py - 4, 3.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    private drawGlasses(offsetX: number, offsetY: number) {
        this.ctx.save();
        this.ctx.strokeStyle = this.colors.glassesFrame;
        this.ctx.lineWidth = 4; // Distinct frame
        this.ctx.lineJoin = 'round';
        this.ctx.fillStyle = this.colors.glassesLens;

        const frameWidth = 70;
        const frameHeight = 50;
        const bridgeWidth = 16;
        const y = -38 + offsetY;

        // Left Lens (Rounded Rect)
        const lx = -frameWidth - bridgeWidth / 2 + offsetX;
        this.drawSoftRect(lx, y, frameWidth, frameHeight, 10);
        this.ctx.fill();
        this.ctx.stroke();

        // Right Lens
        const rx = bridgeWidth / 2 + offsetX;
        this.drawSoftRect(rx, y, frameWidth, frameHeight, 10);
        this.ctx.fill();
        this.ctx.stroke();

        // Bridge (Simple Line)
        this.ctx.beginPath();
        this.ctx.moveTo(lx + frameWidth, y + 15);
        this.ctx.quadraticCurveTo(0 + offsetX, y + 10, rx, y + 15);
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Diagonal Shine (Tech Feel)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        // Shine on left lens
        this.ctx.moveTo(lx + 10, y + 10);
        this.ctx.lineTo(lx + 25, y + 10);
        this.ctx.lineTo(lx + 15, y + 30);
        this.ctx.lineTo(lx, y + 30);
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
        this.ctx.lineWidth = 6;
        this.ctx.lineCap = 'round';

        const emotion = (this.smoothState as any).emotion || 'neutral';

        // Base positions
        const baseY = -65 + offsetY;
        const spacing = 32;
        const browWidth = 40;

        let leftRaised = eyebrows ? eyebrows.left * 25 : 0;
        let rightRaised = eyebrows ? eyebrows.right * 25 : 0;

        // Emotion Modifiers
        let lAngle = 0;
        let rAngle = 0;

        if (emotion === 'happy') {
            leftRaised += 5; rightRaised += 5; // Raised happy brows
        } else if (emotion === 'sad') {
            // Angle inner up
            lAngle = -5; rAngle = -5;
            leftRaised -= 5; rightRaised -= 5;
        } else if (emotion === 'surprised') {
            leftRaised += 15; rightRaised += 15;
        } else if (emotion === 'thinking') {
            leftRaised -= 5; rightRaised += 5; // Asymmetric
            lAngle = 5; rAngle = -2;
        }

        // Left Brow
        this.ctx.beginPath();
        this.ctx.moveTo(-spacing - browWidth + offsetX, baseY - leftRaised + 5 - lAngle);
        this.ctx.quadraticCurveTo(
            -spacing - browWidth / 2 + offsetX,
            baseY - leftRaised - 5,
            -spacing + offsetX,
            baseY - leftRaised + lAngle
        );
        this.ctx.stroke();

        // Right Brow
        this.ctx.beginPath();
        this.ctx.moveTo(spacing + offsetX, baseY - rightRaised + rAngle);
        this.ctx.quadraticCurveTo(
            spacing + browWidth / 2 + offsetX,
            baseY - rightRaised - 5,
            spacing + browWidth + offsetX,
            baseY - rightRaised + 5 - rAngle
        );
        this.ctx.stroke();

        this.ctx.restore();
    }

    private drawNose(offsetX: number, offsetY: number) {
        this.ctx.save();
        this.ctx.strokeStyle = '#d0b090'; // Subtle
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();
        // Minimalist curved nose
        // Just a small 'c' or dot curve
        const nx = 0 + offsetX;
        const ny = 25 + offsetY;

        this.ctx.arc(nx, ny, 6, 0.1, Math.PI - 0.5, false);
        this.ctx.stroke();

        this.ctx.restore();
    }

    private drawHeadphones(rotation: { x: number; y: number; z: number }, offsetY: number) {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.headphones;
        this.ctx.strokeStyle = '#2d3436'; // Dark frame
        this.ctx.lineWidth = 3;


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

    // REST - lips closed, relaxed (Slight smile)
    private drawVisemeRest(x: number, y: number) {
        this.ctx.beginPath();
        this.ctx.moveTo(x - 22, y - 2);
        this.ctx.quadraticCurveTo(x, y + 3, x + 22, y - 2); // Gentle smile curve
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
    private drawVisemeFV(x: number, y: number, _intensity: number) {
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
        this.ctx.lineWidth = 5 + pressure;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 24, y);
        this.ctx.quadraticCurveTo(x, y + 2, x + 24, y);
        this.ctx.stroke();
    }

    // Fallback simple mouth
    private drawMouth(offsetX: number, offsetY: number, openness: number) {
        this.ctx.save();
        const emotion = (this.smoothState as any).emotion || 'neutral';

        const mouthY = 80 + offsetY;

        this.ctx.strokeStyle = this.colors.mouth;
        this.ctx.fillStyle = this.colors.mouth;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';

        let curveY = 3; // Default smile
        if (emotion === 'sad') curveY = -5; // Frown
        if (emotion === 'happy') curveY = 8; // Big smile
        if (emotion === 'surprised') curveY = 0; // O shape

        if (openness < 0.08) {
            // Closed line
            this.ctx.beginPath();
            this.ctx.moveTo(-22 + offsetX, mouthY - 2 + (emotion === 'sad' ? 5 : 0));
            this.ctx.quadraticCurveTo(0 + offsetX, mouthY + curveY, 22 + offsetX, mouthY - 2 + (emotion === 'sad' ? 5 : 0));
            this.ctx.stroke();
        } else if (openness < 0.2) {
            // Half open
            this.ctx.beginPath();
            this.ctx.moveTo(-28 + offsetX, mouthY - 2);
            this.ctx.quadraticCurveTo(offsetX, mouthY + 8 + curveY, 28 + offsetX, mouthY - 2);
            this.ctx.stroke();
        } else {
            // Open
            // ... (keep existing open logic but maybe affected by emotion? Open is open.)
            this.ctx.beginPath();
            const w = 30;
            const h = openness * 60;
            this.ctx.ellipse(offsetX, mouthY + h / 3, w, h / 2, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = '#4A3A3A';
            this.ctx.fill();

            // Tongue
            this.ctx.fillStyle = '#D47060';
            this.ctx.beginPath();
            this.ctx.arc(offsetX, mouthY + h / 1.5, 15, Math.PI, 0);
            this.ctx.fill();
        }

        this.ctx.restore();
    }
}
