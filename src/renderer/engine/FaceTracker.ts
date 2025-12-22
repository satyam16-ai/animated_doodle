import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { FACEMESH_TESSELATION, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYE, FACEMESH_LIPS } from '@mediapipe/face_mesh';

export interface FaceState {
    rotation: { x: number; y: number; z: number };
    mouth: { openness: number; shape: string };
    eyes: { leftOpen: number; rightOpen: number; blink: boolean };
    eyebrows?: { left: number; right: number }; // Optional for backwards compatibility
    position: { x: number; y: number };
}

export class FaceTracker {
    private faceMesh: FaceMesh;
    private camera: Camera | null = null;
    private videoElement: HTMLVideoElement;
    private skeletonCanvas: HTMLCanvasElement | null = null;
    private skeletonCtx: CanvasRenderingContext2D | null = null;
    private onStateChange: (state: FaceState) => void;
    private lastResults: Results | null = null;

    constructor(
        videoElement: HTMLVideoElement,
        onStateChange: (state: FaceState) => void,
        skeletonCanvas?: HTMLCanvasElement
    ) {
        this.videoElement = videoElement;
        this.onStateChange = onStateChange;

        if (skeletonCanvas) {
            this.skeletonCanvas = skeletonCanvas;
            this.skeletonCtx = skeletonCanvas.getContext('2d');
        }

        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            },
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        this.faceMesh.onResults(this.onResults.bind(this));
    }

    async start() {
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.faceMesh.send({ image: this.videoElement });
            },
            width: 640,
            height: 480,
        });
        await this.camera.start();
    }

    getLastLandmarks() {
        if (this.lastResults && this.lastResults.multiFaceLandmarks && this.lastResults.multiFaceLandmarks.length > 0) {
            return this.lastResults.multiFaceLandmarks[0];
        }
        return undefined;
    }

    private onResults(results: Results) {
        this.lastResults = results;

        // Draw skeleton overlay
        if (this.skeletonCanvas && this.skeletonCtx) {
            const ctx = this.skeletonCtx;
            const canvas = this.skeletonCanvas;

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const landmarks = results.multiFaceLandmarks[0];

                // Draw face mesh
                drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 0.5 });

                // Draw eyes
                drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#30FF30', lineWidth: 2 });
                drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#30FF30', lineWidth: 2 });

                // Draw lips
                drawConnectors(ctx, landmarks, FACEMESH_LIPS, { color: '#FF3030', lineWidth: 2 });

                // Draw key landmarks
                drawLandmarks(ctx, [landmarks[1]], { color: '#FFFF00', radius: 3 }); // Nose tip
                drawLandmarks(ctx, [landmarks[234], landmarks[454]], { color: '#00FFFF', radius: 2 }); // Ears
            }

            ctx.restore();
        }

        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];

        // Calculate face metrics
        const nose = landmarks[1];
        const leftEar = landmarks[234];
        const rightEar = landmarks[454];
        const chin = landmarks[152];
        const top = landmarks[10];

        // Yaw (Turn Left/Right)
        const faceWidth = Math.abs(rightEar.x - leftEar.x);
        const noseToLeft = Math.abs(nose.x - leftEar.x);
        const yawRaw = (noseToLeft / faceWidth) - 0.5;
        const yaw = yawRaw * 2;

        // Pitch (Up/Down)
        const faceHeight = Math.abs(chin.y - top.y);
        const noseToTop = Math.abs(nose.y - top.y);
        const pitchRaw = (noseToTop / faceHeight) - 0.5;
        const pitch = pitchRaw * 2;

        // Roll (Tilt)
        const dy = rightEar.y - leftEar.y;
        const dx = rightEar.x - leftEar.x;
        const roll = Math.atan2(dy, dx);

        // Mouth Openness (improved)
        const upperLip_y = landmarks[13].y;
        const lowerLip_y = landmarks[14].y;
        const mouthHeight = Math.abs(lowerLip_y - upperLip_y);
        const mouthWidth = Math.abs(landmarks[61].x - landmarks[291].x);
        const openness = mouthHeight / mouthWidth;

        // Eye Aspect Ratio (EAR) for blinking
        const getEyeOpenness = (topId: number, bottomId: number, leftId: number, rightId: number) => {
            const h = Math.abs(landmarks[topId].y - landmarks[bottomId].y);
            const w = Math.abs(landmarks[leftId].x - landmarks[rightId].x);
            return h / w;
        };

        const leftOpenness = getEyeOpenness(159, 145, 33, 133);
        const rightOpenness = getEyeOpenness(386, 374, 362, 263);

        // Increased threshold for better blink detection (was 0.05)
        // Normal open eye is ~0.3. Blinking is ~0.05-0.15.
        const blinkThreshold = 0.20;
        const isBlinking = leftOpenness < blinkThreshold && rightOpenness < blinkThreshold;

        // Face position (for smoother movement)
        const position = {
            x: nose.x,
            y: nose.y
        };

        // Eyebrow calculation (avg y of brow vs top of eye)
        // Left Brow (65) vs Left Eye Top (159)
        // Right Brow (295) vs Right Eye Top (386)
        // Normal distance is ~0.05. Higher distance = raised.
        const leftBrowY = landmarks[65].y;
        const leftEyeTopY = landmarks[159].y;
        const rightBrowY = landmarks[295].y;
        const rightEyeTopY = landmarks[386].y;

        const leftBrowRaised = Math.max(0, (leftEyeTopY - leftBrowY) * 10); // Scale for usability
        const rightBrowRaised = Math.max(0, (rightEyeTopY - rightBrowY) * 10);

        this.onStateChange({
            rotation: { x: pitch, y: yaw, z: roll },
            mouth: {
                openness,
                shape: openness > 0.25 ? 'open' : openness > 0.12 ? 'half' : 'closed'
            },
            eyes: { leftOpen: leftOpenness, rightOpen: rightOpenness, blink: isBlinking },
            eyebrows: { left: leftBrowRaised, right: rightBrowRaised }, // New eyebrow data
            position
        });
    }
}
