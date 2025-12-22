/**
 * VisemeEngine - Converts audio analysis into mouth shapes (visemes)
 * Based on audio characteristics, not ML/phoneme detection (Phase 1)
 */

export enum Viseme {
    REST = 'REST',      // silence - lips closed, relaxed
    AA = 'AA',          // a, ah - mouth wide open
    E = 'E',            // ee, ih - mouth stretched sideways
    O = 'O',            // oh - rounded lips
    U = 'U',            // oo - small rounded opening
    FV = 'FV',          // f, v - teeth touch lower lip
    MBP = 'MBP'         // m, b, p - lips fully closed, pressed
}

export interface VisemeState {
    current: Viseme;
    previous: Viseme;
    transitionProgress: number; // 0-1, for smooth blending
    intensity: number; // 0-1, how exaggerated the shape is
}

export class VisemeEngine {
    private currentViseme: Viseme = Viseme.REST;
    private previousViseme: Viseme = Viseme.REST;
    private transitionProgress: number = 1.0; // 1.0 = fully transitioned
    private transitionDuration: number = 100; // ms
    private lastTransitionTime: number = 0;
    private visemeHoldFrames: number = 0;
    private minHoldFrames: number = 2; // Minimum frames to hold a viseme

    // Audio history for better detection
    private volumeHistory: number[] = [];
    private maxHistoryLength: number = 5;

    /**
     * Determine which viseme to show based on audio analysis
     */
    determineViseme(audioData: {
        volume: number;           // 0-1 overall volume
        lowFreq: number;          // 0-1 bass energy
        midFreq: number;          // 0-1 mid-range energy
        highFreq: number;         // 0-1 treble energy
        zeroCrossingRate: number; // Rate of sign changes (consonants vs vowels)
    }): VisemeState {
        const now = performance.now();

        // Update volume history
        this.volumeHistory.push(audioData.volume);
        if (this.volumeHistory.length > this.maxHistoryLength) {
            this.volumeHistory.shift();
        }

        // Calculate volume dynamics
        const avgVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length;
        const volumeChange = audioData.volume - avgVolume;

        // Determine new viseme based on audio characteristics
        let targetViseme = this.selectViseme(audioData, volumeChange);

        // Apply minimum hold time (prevents jitter)
        if (this.visemeHoldFrames < this.minHoldFrames) {
            targetViseme = this.currentViseme;
            this.visemeHoldFrames++;
        } else if (targetViseme !== this.currentViseme) {
            // Start new transition
            this.previousViseme = this.currentViseme;
            this.currentViseme = targetViseme;
            this.lastTransitionTime = now;
            this.transitionProgress = 0;
            this.visemeHoldFrames = 0;
        }

        // Update transition progress
        if (this.transitionProgress < 1.0) {
            const elapsed = now - this.lastTransitionTime;
            this.transitionProgress = Math.min(1.0, elapsed / this.transitionDuration);
        }

        // Calculate intensity (exaggeration) based on volume
        const intensity = Math.min(1.0, audioData.volume * 1.5);

        return {
            current: this.currentViseme,
            previous: this.previousViseme,
            transitionProgress: this.easeInOutCubic(this.transitionProgress),
            intensity
        };
    }

    /**
     * Select viseme based on audio characteristics
     * This is Phase 1 - heuristic-based, not ML
     */
    private selectViseme(audioData: any, volumeChange: number): Viseme {
        const { volume, lowFreq, midFreq, highFreq, zeroCrossingRate } = audioData;

        // SILENCE - very low volume
        if (volume < 0.05) {
            return Viseme.REST;
        }

        // PLOSIVES (p, b, m) - sudden volume spike + low frequency
        if (volumeChange > 0.15 && lowFreq > 0.6 && zeroCrossingRate < 0.3) {
            return Viseme.MBP;
        }

        // FRICATIVES (f, v) - high zero-crossing + high frequency
        if (zeroCrossingRate > 0.6 && highFreq > 0.5) {
            return Viseme.FV;
        }

        // Wide open sounds (aa, ah) - high volume + low zero-crossing
        if (volume > 0.6 && lowFreq > 0.5 && zeroCrossingRate < 0.4) {
            return Viseme.AA;
        }

        // Rounded sounds (oh) - mid-high volume + balanced frequencies
        if (volume > 0.4 && midFreq > 0.5 && lowFreq > 0.3) {
            return Viseme.O;
        }

        // Small rounded (oo) - lower volume + mid frequency
        if (volume > 0.25 && volume < 0.5 && midFreq > 0.4) {
            return Viseme.U;
        }

        // Stretched sounds (ee, ih) - high frequency + mid volume
        if (highFreq > 0.4 && volume > 0.3) {
            return Viseme.E;
        }

        // Default to slight opening for any sound
        if (volume > 0.1) {
            return Viseme.AA;
        }

        return Viseme.REST;
    }

    /**
     * Smooth easing function - "mouth arrives early, leaves late"
     */
    private easeInOutCubic(t: number): number {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Get debug info for overlay
     */
    getDebugInfo(): string {
        return `${this.currentViseme} (${(this.transitionProgress * 100).toFixed(0)}%)`;
    }
}
