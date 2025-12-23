import { FaceState } from './FaceTracker';
import { AudioAnalyzer } from './AudioAnalyzer';
import { VisemeEngine, VisemeState } from './VisemeEngine';

export interface AvatarState {
    rotation: { x: number; y: number; z: number };
    mouth: { openness: number; shape: string };
    eyes: { leftOpen: number; rightOpen: number; blink: boolean };
    position: { x: number; y: number };
    eyebrows?: { left: number; right: number };
    viseme?: VisemeState;
    emotion: 'neutral' | 'happy' | 'sad' | 'surprised' | 'thinking';
}

import { SpeechIntegrator } from './SpeechIntegrator';

export class AvatarStateEngine {
    private currentFaceState: FaceState = {
        rotation: { x: 0, y: 0, z: 0 },
        mouth: { openness: 0, shape: 'closed' },
        eyes: { leftOpen: 1, rightOpen: 1, blink: false },
        position: { x: 0.5, y: 0.5 },
        emotion: 'neutral'
    };

    private audioAnalyzer: AudioAnalyzer | null = null;
    private visemeEngine: VisemeEngine;
    private speechIntegrator: SpeechIntegrator;
    private lastVoiceLevel = 0;

    constructor(audioAnalyzer?: AudioAnalyzer) {
        if (audioAnalyzer) {
            this.audioAnalyzer = audioAnalyzer;
        }
        this.visemeEngine = new VisemeEngine();
        this.speechIntegrator = new SpeechIntegrator();
        this.speechIntegrator.start();
    }

    updateFaceState(state: FaceState) {
        this.currentFaceState = state;
    }

    getState(): AvatarState {
        const state = { ...this.currentFaceState };

        // Enhance mouth with audio using advanced viseme system
        if (this.audioAnalyzer) {
            // Get detailed audio analysis
            const audioData = this.audioAnalyzer.getDetailedAnalysis();
            this.lastVoiceLevel = audioData.volume;

            // Check Hybrid Speech Detection
            const isSpeechDetected = this.speechIntegrator.getIsSpeaking();

            // Update voice level indicator in UI
            const voiceBar = document.getElementById('voice-bar');
            if (voiceBar) {
                voiceBar.style.width = `${audioData.volume * 100}%`;
            }

            // Get viseme state from engine
            let visemeState = this.visemeEngine.determineViseme(audioData);

            // HYBRID SYNC: If volume is low but speech DETECTED, force movement
            // Check 'current' property, not 'viseme'
            if (visemeState.current === 'REST' && isSpeechDetected && audioData.volume < 0.05) {
                // Synthesize a filler viseme
                const time = Date.now() / 150;
                visemeState = {
                    current: Math.sin(time) > 0 ? 'FV' as any : 'O' as any, // Cast to any or import Viseme
                    previous: 'REST' as any,
                    transitionProgress: 1,
                    intensity: 0.4
                };
            }

            // Update debug overlay if exists
            const debugViseme = document.getElementById('debug-viseme');
            if (debugViseme) {
                debugViseme.textContent = visemeState.current;
            }

            const debugAudio = document.getElementById('debug-audio');
            if (debugAudio) {
                debugAudio.textContent = `Vol: ${(audioData.volume * 100).toFixed(0)}%`;
            }

            // Pass viseme state to avatar renderer
            (state as AvatarState).viseme = visemeState;

            // Also update basic mouth state for backwards compatibility
            if (audioData.volume > 0.08) {
                const audioOpenness = Math.min(audioData.volume * 1.5, 1);
                state.mouth.openness = Math.max(state.mouth.openness, audioOpenness);

                if (audioData.volume > 0.4) {
                    state.mouth.shape = 'open';
                } else if (audioData.volume > 0.15) {
                    state.mouth.shape = 'half';
                } else {
                    state.mouth.shape = 'closed';
                }
            }
        }

        return state;
    }

    getVoiceLevel(): number {
        return this.lastVoiceLevel;
    }
}
