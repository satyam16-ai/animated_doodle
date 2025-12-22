import { NormalizedLandmarkList } from '@mediapipe/face_mesh';

export interface DetailedFaceAnalysis {
    // Colors
    skinColor: string;
    hairColor: string;
    eyeColor: string;
    lipColor: string;

    // Face shape and proportions
    faceShape: 'oval' | 'round' | 'square' | 'heart' | 'long';
    faceWidth: number;
    faceHeight: number;
    jawWidth: number;
    foreheadWidth: number;

    // Hair
    hasHair: boolean;
    hairStyle: 'short' | 'medium' | 'long' | 'bald';
    hairCoverage: { top: boolean; sides: boolean; back: boolean };
    hairLine: number; // 0-1, where hairline starts

    // Eyes
    eyeSize: number; // relative size
    eyeShape: 'almond' | 'round' | 'hooded';
    eyeSpacing: number;
    eyeAngle: number; // tilt

    // Eyebrows
    eyebrowThickness: number;
    eyebrowArch: number;

    // Nose
    noseWidth: number;
    noseLength: number;
    noseShape: 'small' | 'medium' | 'large';

    // Mouth
    mouthWidth: number;
    lipThickness: number;

    // Facial hair
    hasBeard: boolean;
    beardColor: string;
    beardStyle: 'none' | 'stubble' | 'short' | 'full';
    hasMustache: boolean;

    // Glasses
    hasGlasses: boolean;
}

export class FaceAnalyzer {
    /**
     * Analyze face from image and landmarks to extract detailed features
     */
    analyzeFace(imageData: ImageData, landmarks?: NormalizedLandmarkList): DetailedFaceAnalysis {
        const { width, height, data } = imageData;

        // Extract colors from image regions
        const colors = this.extractColors(data, width, height, landmarks);

        // Analyze facial structure from landmarks
        const structure = landmarks ? this.analyzeFacialStructure(landmarks, width, height) : this.getDefaultStructure();

        // Detect hair from image
        const hairInfo = this.detectHair(data, width, height, colors.hairColor);

        // Detect facial hair
        const facialHair = this.detectFacialHair(data, width, height, landmarks);

        return {
            ...colors,
            ...structure,
            ...hairInfo,
            ...facialHair,
            hasGlasses: false, // TODO: Implement glasses detection
        };
    }

    private extractColors(data: Uint8ClampedArray, width: number, height: number, landmarks?: NormalizedLandmarkList) {
        // If we have landmarks, use them for precise sampling
        if (landmarks) {
            return this.extractColorsFromLandmarks(data, width, height, landmarks);
        }

        // Fallback to region-based sampling
        const skinSamples: number[][] = [];
        const hairSamples: number[][] = [];
        const lipSamples: number[][] = [];

        // Sample skin from center of face
        for (let y = height * 0.4; y < height * 0.6; y += 10) {
            for (let x = width * 0.4; x < width * 0.6; x += 10) {
                const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                skinSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
            }
        }

        // Sample hair from top
        for (let y = height * 0.05; y < height * 0.25; y += 8) {
            for (let x = width * 0.3; x < width * 0.7; x += 8) {
                const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                hairSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
            }
        }

        // Sample lips
        for (let y = height * 0.65; y < height * 0.75; y += 5) {
            for (let x = width * 0.42; x < width * 0.58; x += 5) {
                const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                if (r > g && r > b) {
                    lipSamples.push([r, g, b]);
                }
            }
        }

        return {
            skinColor: this.averageColor(skinSamples),
            hairColor: this.averageColor(hairSamples),
            eyeColor: '#3a3a3a',
            lipColor: lipSamples.length > 0 ? this.averageColor(lipSamples) : '#D89090',
        };
    }

    private extractColorsFromLandmarks(data: Uint8ClampedArray, width: number, height: number, landmarks: NormalizedLandmarkList) {
        const getPixelColor = (x: number, y: number): number[] => {
            const px = Math.floor(x * width);
            const py = Math.floor(y * height);
            const idx = (py * width + px) * 4;
            return [data[idx], data[idx + 1], data[idx + 2]];
        };

        // Sample skin from cheek area (landmarks around cheekbones)
        const skinSamples: number[][] = [];
        const skinLandmarks = [50, 101, 118, 101, 330, 280]; // Cheek and forehead points
        for (const idx of skinLandmarks) {
            if (landmarks[idx]) {
                skinSamples.push(getPixelColor(landmarks[idx].x, landmarks[idx].y));
            }
        }

        // Sample hair from top of head
        const hairSamples: number[][] = [];
        const hairLandmarks = [10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58]; // Top forehead area
        for (const idx of hairLandmarks) {
            if (landmarks[idx]) {
                const x = landmarks[idx].x;
                const y = landmarks[idx].y - 0.1; // Sample above forehead
                if (y >= 0) {
                    hairSamples.push(getPixelColor(x, y));
                }
            }
        }

        // Sample lips
        const lipSamples: number[][] = [];
        const lipLandmarks = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]; // Lip area
        for (const idx of lipLandmarks) {
            if (landmarks[idx]) {
                lipSamples.push(getPixelColor(landmarks[idx].x, landmarks[idx].y));
            }
        }

        // Sample eyes (iris area)
        const eyeSamples: number[][] = [];
        const eyeLandmarks = [468, 469, 470, 471, 472]; // Right eye iris landmarks
        for (const idx of eyeLandmarks) {
            if (landmarks[idx]) {
                eyeSamples.push(getPixelColor(landmarks[idx].x, landmarks[idx].y));
            }
        }

        return {
            skinColor: this.averageColor(skinSamples),
            hairColor: this.averageColor(hairSamples),
            eyeColor: eyeSamples.length > 0 ? this.averageColor(eyeSamples) : '#4a4a4a',
            lipColor: this.averageColor(lipSamples),
        };
    }

    private analyzeFacialStructure(landmarks: NormalizedLandmarkList, width: number, height: number) {
        // Calculate face measurements
        const leftEar = landmarks[234];
        const rightEar = landmarks[454];
        const chin = landmarks[152];
        const forehead = landmarks[10];
        const nose = landmarks[1];

        // Face dimensions
        const faceWidth = Math.abs(rightEar.x - leftEar.x);
        const faceHeight = Math.abs(chin.y - forehead.y);
        const aspectRatio = faceWidth / faceHeight;

        // Jaw width (lower face)
        const leftJaw = landmarks[172];
        const rightJaw = landmarks[397];
        const jawWidth = Math.abs(rightJaw.x - leftJaw.x);

        // Forehead width (upper face)
        const leftForehead = landmarks[21];
        const rightForehead = landmarks[251];
        const foreheadWidth = Math.abs(rightForehead.x - leftForehead.x);

        // Determine face shape
        let faceShape: 'oval' | 'round' | 'square' | 'heart' | 'long' = 'oval';
        if (aspectRatio > 0.85) {
            faceShape = 'round';
        } else if (aspectRatio < 0.7) {
            faceShape = 'long';
        } else if (jawWidth / faceWidth > 0.9) {
            faceShape = 'square';
        } else if (foreheadWidth > jawWidth * 1.1) {
            faceShape = 'heart';
        }

        // Eyes
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const eyeSpacing = Math.abs(rightEye.x - leftEye.x) / faceWidth;

        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const eyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const eyeWidth = Math.abs(landmarks[133].x - landmarks[33].x);
        const eyeSize = (eyeHeight / faceHeight) * 10; // Normalized size

        const eyeShape: 'almond' | 'round' | 'hooded' = eyeHeight / eyeWidth > 0.6 ? 'round' : 'almond';

        // Eyebrows
        const leftBrowInner = landmarks[17];
        const leftBrowOuter = landmarks[8];
        const leftBrowTop = landmarks[105];
        const leftBrowBottom = landmarks[55];
        const eyebrowThickness = (Math.abs(leftBrowTop.y - leftBrowBottom.y) / faceHeight) * 20;
        const eyebrowArch = (leftBrowTop.y - leftBrowInner.y) / faceHeight;

        // Nose
        const noseTip = landmarks[4];
        const noseTop = landmarks[6];
        const noseLeft = landmarks[129];
        const noseRight = landmarks[358];
        const noseWidth = Math.abs(noseRight.x - noseLeft.x) / faceWidth;
        const noseLength = Math.abs(noseTip.y - noseTop.y) / faceHeight;

        let noseShape: 'small' | 'medium' | 'large' = 'medium';
        if (noseWidth < 0.15) noseShape = 'small';
        else if (noseWidth > 0.20) noseShape = 'large';

        // Mouth
        const mouthLeft = landmarks[61];
        const mouthRight = landmarks[291];
        const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x) / faceWidth;

        const upperLip = landmarks[13];
        const lowerLip = landmarks[14];
        const lipThickness = (Math.abs(lowerLip.y - upperLip.y) / faceHeight) * 10;

        return {
            faceShape,
            faceWidth: faceWidth * width,
            faceHeight: faceHeight * height,
            jawWidth: jawWidth * width,
            foreheadWidth: foreheadWidth * width,
            eyeSize,
            eyeShape,
            eyeSpacing,
            eyeAngle: 0, // Could calculate from eye corners
            eyebrowThickness,
            eyebrowArch,
            noseWidth: noseWidth * width,
            noseLength: noseLength * height,
            noseShape,
            mouthWidth: mouthWidth * width,
            lipThickness,
        };
    }

    private detectHair(data: Uint8ClampedArray, width: number, height: number, hairColor: string): any {
        // Check for hair coverage by analyzing top region
        let topCoverage = 0;
        let sampleCount = 0;

        const hairRGB = this.hexToRgb(hairColor);

        // Sample top 20% of image
        for (let y = 0; y < height * 0.2; y += 5) {
            for (let x = width * 0.2; x < width * 0.8; x += 5) {
                const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                // Check if pixel is similar to hair color
                const diff = Math.abs(r - hairRGB[0]) + Math.abs(g - hairRGB[1]) + Math.abs(b - hairRGB[2]);
                if (diff < 100) {
                    topCoverage++;
                }
                sampleCount++;
            }
        }

        const coverageRatio = topCoverage / sampleCount;
        const hasHair = coverageRatio > 0.3;

        let hairStyle: 'short' | 'medium' | 'long' | 'bald' = 'bald';
        if (hasHair) {
            if (coverageRatio > 0.6) hairStyle = 'long';
            else if (coverageRatio > 0.4) hairStyle = 'medium';
            else hairStyle = 'short';
        }

        return {
            hasHair,
            hairStyle,
            hairCoverage: {
                top: hasHair,
                sides: hasHair,
                back: true,
            },
            hairLine: hasHair ? 0.15 : 0.3,
        };
    }

    private detectFacialHair(data: Uint8ClampedArray, width: number, height: number, landmarks?: NormalizedLandmarkList): any {
        // Sample chin and upper lip area for facial hair
        let darkPixels = 0;
        let totalPixels = 0;

        // Check chin area
        for (let y = height * 0.70; y < height * 0.85; y += 3) {
            for (let x = width * 0.35; x < width * 0.65; x += 3) {
                const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const brightness = (r + g + b) / 3;

                if (brightness < 100) darkPixels++;
                totalPixels++;
            }
        }

        const darkRatio = darkPixels / totalPixels;
        const hasBeard = darkRatio > 0.4;

        let beardStyle: 'none' | 'stubble' | 'short' | 'full' = 'none';
        if (hasBeard) {
            if (darkRatio > 0.7) beardStyle = 'full';
            else if (darkRatio > 0.5) beardStyle = 'short';
            else beardStyle = 'stubble';
        }

        // Check upper lip for mustache
        darkPixels = 0;
        totalPixels = 0;
        for (let y = height * 0.58; y < height * 0.65; y += 2) {
            for (let x = width * 0.42; x < width * 0.58; x += 2) {
                const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness < 100) darkPixels++;
                totalPixels++;
            }
        }

        const hasMustache = (darkPixels / totalPixels) > 0.3;

        return {
            hasBeard,
            beardColor: '#2a2a2a',
            beardStyle,
            hasMustache,
        };
    }

    private getDefaultStructure() {
        return {
            faceShape: 'oval' as const,
            faceWidth: 300,
            faceHeight: 350,
            jawWidth: 200,
            foreheadWidth: 250,
            eyeSize: 1.0,
            eyeShape: 'almond' as const,
            eyeSpacing: 0.3,
            eyeAngle: 0,
            eyebrowThickness: 1.0,
            eyebrowArch: 0.1,
            noseWidth: 40,
            noseLength: 60,
            noseShape: 'medium' as const,
            mouthWidth: 80,
            lipThickness: 1.0,
        };
    }

    private averageColor(samples: number[][]): string {
        if (samples.length === 0) return '#D4B5A0';

        let r = 0, g = 0, b = 0;
        for (const [sr, sg, sb] of samples) {
            r += sr;
            g += sg;
            b += sb;
        }

        r = Math.floor(r / samples.length);
        g = Math.floor(g / samples.length);
        b = Math.floor(b / samples.length);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    private hexToRgb(hex: string): number[] {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [200, 180, 160];
    }
}
