import * as THREE from 'three';
import { Viseme, VisemeState } from './VisemeEngine';
import { FacialLandmarks } from './FaceDetector3D';

/**
 * MorphTargetAnimator - Animates 3D models using multiple techniques
 * Supports morph targets, bone animation, and vertex deformation
 */

export class MorphTargetAnimator {
    private mesh: THREE.Mesh | null = null;
    private landmarks: FacialLandmarks | null = null;
    private originalPositions: Float32Array | null = null;
    private bones: Map<string, THREE.Bone> = new Map();
    private jawBone: THREE.Bone | null = null;

    constructor(mesh: THREE.Mesh, landmarks: FacialLandmarks) {
        this.mesh = mesh;
        this.landmarks = landmarks;

        // Store original vertex positions for deformation
        if (mesh.geometry.attributes.position) {
            this.originalPositions = new Float32Array(
                mesh.geometry.attributes.position.array
            );
        }

        // Scan for bones (if model has a rig)
        this.scanForBones(mesh);
    }

    /**
     * Scan object hierarchy for bones
     */
    private scanForBones(object: THREE.Object3D) {
        object.traverse((child) => {
            if (child instanceof THREE.Bone || (child as any).isBone) {
                const boneName = child.name.toLowerCase();
                this.bones.set(boneName, child as THREE.Bone);

                // Try to identify jaw bone
                if (boneName.includes('jaw') || boneName.includes('chin') || boneName.includes('mandible')) {
                    this.jawBone = child as THREE.Bone;
                    console.log('✅ Found jaw bone:', child.name);
                }
            }
        });

        if (this.bones.size > 0) {
            console.log(`Found ${this.bones.size} bones in model`);
        }
    }

    /**
     * Apply viseme-based animation to the model
     */
    applyViseme(visemeState: VisemeState) {
        if (!this.mesh || !this.landmarks) return;

        const { current, intensity } = visemeState;

        // Try different animation methods in order of preference
        if (this.applyMorphTargets(current, intensity)) {
            return; // Success with morph targets
        }

        if (this.applyBoneAnimation(current, intensity)) {
            return; // Success with bone animation
        }

        // Fallback to vertex deformation
        this.applyVertexDeformation(current, intensity);
    }

    /**
     * Method 1: Morph targets / Blend shapes
     */
    private applyMorphTargets(viseme: Viseme, intensity: number): boolean {
        if (!this.mesh || !this.mesh.morphTargetInfluences) {
            return false;
        }

        const dict = this.mesh.morphTargetDictionary;
        if (!dict) return false;

        // Reset all influences
        this.mesh.morphTargetInfluences.fill(0);

        // Map visemes to common morph target names
        const morphMap: Record<Viseme, string[]> = {
            [Viseme.REST]: ['mouthClose', 'neutral'],
            [Viseme.AA]: ['mouthOpen', 'jawOpen', 'aa'],
            [Viseme.E]: ['mouthSmile', 'ee', 'mouthStretch'],
            [Viseme.O]: ['mouthFunnel', 'oh', 'mouthRound'],
            [Viseme.U]: ['mouthPucker', 'oo', 'mouthPout'],
            [Viseme.FV]: ['mouthLowerDown', 'ff', 'mouthPress'],
            [Viseme.MBP]: ['mouthClose', 'mouthPress']
        };

        const targets = morphMap[viseme] || [];
        let applied = false;

        for (const targetName of targets) {
            // Try exact match
            if (dict[targetName] !== undefined) {
                this.mesh.morphTargetInfluences[dict[targetName]] = intensity;
                applied = true;
                break;
            }

            // Try case-insensitive match
            const key = Object.keys(dict).find(k => k.toLowerCase() === targetName.toLowerCase());
            if (key && dict[key] !== undefined) {
                this.mesh.morphTargetInfluences[dict[key]] = intensity;
                applied = true;
                break;
            }
        }

        return applied;
    }

    /**
     * Method 2: Bone animation
     */
    private applyBoneAnimation(viseme: Viseme, intensity: number): boolean {
        if (!this.jawBone) return false;

        // Calculate jaw rotation based on viseme
        let jawRotation = 0;

        switch (viseme) {
            case Viseme.AA:
                jawRotation = 0.5 * intensity; // Wide open
                break;
            case Viseme.O:
                jawRotation = 0.3 * intensity;
                break;
            case Viseme.E:
                jawRotation = 0.15 * intensity;
                break;
            case Viseme.U:
                jawRotation = 0.2 * intensity;
                break;
            case Viseme.FV:
                jawRotation = 0.1 * intensity;
                break;
            case Viseme.MBP:
                jawRotation = 0;
                break;
            default:
                jawRotation = 0;
        }

        // Apply rotation to jaw bone (rotate around X axis)
        this.jawBone.rotation.x = jawRotation;

        return true;
    }

    /**
     * Method 3: Direct vertex deformation (fallback)
     */
    private applyVertexDeformation(viseme: Viseme, intensity: number) {
        if (!this.mesh || !this.landmarks || !this.originalPositions) return;

        const geometry = this.mesh.geometry;
        const positions = geometry.attributes.position;

        // Reset to original positions
        positions.array.set(this.originalPositions);

        // Calculate deformation based on viseme
        let mouthOpenAmount = 0;
        let mouthWidthAmount = 0;

        switch (viseme) {
            case Viseme.AA:
                mouthOpenAmount = 0.25 * intensity;  // 5x increase
                mouthWidthAmount = 0.10 * intensity;
                break;
            case Viseme.E:
                mouthOpenAmount = 0.05 * intensity;
                mouthWidthAmount = 0.20 * intensity; // Wide smile
                break;
            case Viseme.O:
                mouthOpenAmount = 0.15 * intensity;
                mouthWidthAmount = -0.05 * intensity; // Pucker
                break;
            case Viseme.U:
                mouthOpenAmount = 0.10 * intensity;
                mouthWidthAmount = -0.10 * intensity; // More pucker
                break;
            case Viseme.FV:
                mouthOpenAmount = 0.025 * intensity;
                break;
            case Viseme.MBP:
                mouthOpenAmount = 0;
                break;
        }

        // Apply deformation to mouth vertices
        const mouthCenter = this.landmarks.mouthCenter;

        for (const idx of this.landmarks.mouthVertices) {
            const x = positions.getX(idx);
            const y = positions.getY(idx);
            const z = positions.getZ(idx);

            // Calculate distance from mouth center
            const dx = x - mouthCenter.x;
            const dy = y - mouthCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Apply falloff based on distance
            const falloff = Math.max(0, 1 - dist * 5);

            // Move vertices down (open mouth)
            const newY = y - mouthOpenAmount * falloff;

            // Move vertices horizontally (smile/pucker)
            const newX = x + dx * mouthWidthAmount * falloff;

            positions.setXYZ(idx, newX, newY, z);
        }

        // Apply jaw rotation using vertex manipulation
        const jawPivot = this.landmarks.jawPivot;
        const jawRotation = mouthOpenAmount * 3; // Increased from 5 for smoother but still visible movement

        for (const idx of this.landmarks.jawVertices) {
            const x = positions.getX(idx);
            const y = positions.getY(idx);
            const z = positions.getZ(idx);

            // Rotate around jaw pivot
            const dy = y - jawPivot.y;
            const dz = z - jawPivot.z;
            const dist = Math.sqrt(dy * dy + dz * dz);

            if (dist > 0.001) {
                const angle = Math.atan2(dz, dy);
                const newAngle = angle + jawRotation;
                const newY = jawPivot.y + Math.cos(newAngle) * dist;
                const newZ = jawPivot.z + Math.sin(newAngle) * dist;

                positions.setXYZ(idx, x, newY, newZ);
            }
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals(); // Recalculate normals for proper lighting
    }

    /**
     * Apply head rotation to match face tracking
     */
    applyHeadRotation(rotation: { x: number; y: number; z: number }) {
        if (!this.mesh) return;

        // Apply rotation to the mesh
        this.mesh.rotation.x = rotation.x * 0.5; // Pitch
        this.mesh.rotation.y = rotation.y * 0.5; // Yaw
        this.mesh.rotation.z = rotation.z * 0.3; // Roll
    }
}
