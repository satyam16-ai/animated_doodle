import * as THREE from 'three';

/**
 * FaceDetector3D - Automatic facial landmark detection on 3D models
 * Analyzes mesh geometry to identify facial features for animation
 */

export interface FacialLandmarks {
    mouthVertices: number[];
    jawVertices: number[];
    leftEyeVertices: number[];
    rightEyeVertices: number[];
    noseVertices: number[];
    mouthCenter: THREE.Vector3;
    jawPivot: THREE.Vector3;
    headCenter: THREE.Vector3;
    bounds: {
        min: THREE.Vector3;
        max: THREE.Vector3;
    };
}

export class FaceDetector3D {
    private mesh: THREE.Mesh | null = null;
    private landmarks: FacialLandmarks | null = null;

    /**
     * Analyze a 3D mesh to detect facial landmarks
     */
    async detectFace(object: THREE.Object3D): Promise<FacialLandmarks | null> {
        // Find the first mesh in the object hierarchy
        this.mesh = this.findMainMesh(object);

        if (!this.mesh || !this.mesh.geometry) {
            console.warn('No mesh geometry found in the object');
            return null;
        }

        console.log('🔍 Analyzing mesh for facial features...');

        // Ensure geometry has position attribute
        const geometry = this.mesh.geometry;
        if (!geometry.attributes.position) {
            console.warn('Mesh has no position attribute');
            return null;
        }

        // Analyze geometry
        this.landmarks = this.analyzeGeometry(geometry);

        if (this.landmarks) {
            console.log('✅ Facial landmarks detected:', this.landmarks);
        } else {
            console.warn('⚠️ Could not detect facial features');
        }

        return this.landmarks;
    }

    /**
     * Find the main mesh in the object hierarchy
     */
    private findMainMesh(object: THREE.Object3D): THREE.Mesh | null {
        if (object instanceof THREE.Mesh) {
            return object;
        }

        // Search children
        for (const child of object.children) {
            const mesh = this.findMainMesh(child);
            if (mesh) return mesh;
        }

        return null;
    }

    /**
     * Analyze geometry to detect facial features
     */
    private analyzeGeometry(geometry: THREE.BufferGeometry): FacialLandmarks | null {
        const positionAttr = geometry.attributes.position;
        // Type guard to ensure we have a BufferAttribute
        if (!positionAttr || positionAttr instanceof THREE.InterleavedBufferAttribute) {
            console.warn('Position attribute is not a BufferAttribute');
            return null;
        }
        const positions = positionAttr as THREE.BufferAttribute;
        const vertexCount = positions.count;

        if (vertexCount === 0) return null;

        // Calculate bounding box
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox!;
        const bounds = {
            min: bbox.min.clone(),
            max: bbox.max.clone()
        };

        const center = new THREE.Vector3();
        bbox.getCenter(center);

        // Determine front face direction (assume model faces +Z or -Z)
        const vertices: THREE.Vector3[] = [];
        for (let i = 0; i < vertexCount; i++) {
            vertices.push(new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            ));
        }

        // Find average Z to determine which direction is front
        const avgZ = vertices.reduce((sum, v) => sum + v.z, 0) / vertexCount;
        const isFrontPositiveZ = Math.abs(bbox.max.z - avgZ) < Math.abs(bbox.min.z - avgZ);
        const frontZ = isFrontPositiveZ ? bbox.max.z : bbox.min.z;

        // Get frontmost vertices (face region)
        const threshold = (bbox.max.z - bbox.min.z) * 0.15; // 15% threshold
        const frontVertices = vertices
            .map((v, idx) => ({ vertex: v, index: idx }))
            .filter(({ vertex }) =>
                isFrontPositiveZ
                    ? vertex.z > frontZ - threshold
                    : vertex.z < frontZ + threshold
            );

        console.log(`Found ${frontVertices.length} front-facing vertices`);

        // Divide face into regions based on Y coordinate
        const height = bbox.max.y - bbox.min.y;
        const yLowerThird = bbox.min.y + height * 0.33;
        const yUpperThird = bbox.min.y + height * 0.66;

        // Find mouth region (lower third, central)
        const width = bbox.max.x - bbox.min.x;
        const centerX = center.x;
        const mouthVertices = frontVertices
            .filter(({ vertex }) =>
                vertex.y < yLowerThird &&
                vertex.y > bbox.min.y + height * 0.1 &&
                Math.abs(vertex.x - centerX) < width * 0.25
            )
            .map(({ index }) => index);

        // Mouth center (average of mouth vertices)
        const mouthCenter = this.getVertexCenter(positions, mouthVertices);

        // Jaw vertices (bottom region, wide)
        const jawVertices = frontVertices
            .filter(({ vertex }) =>
                vertex.y < yLowerThird &&
                Math.abs(vertex.x - centerX) < width * 0.4
            )
            .map(({ index }) => index);

        // Jaw pivot point (lowest point of jaw, centered)
        const jawPivot = new THREE.Vector3(
            centerX,
            bbox.min.y + height * 0.05,
            frontZ
        );

        // Eye regions (upper third, left and right of center)
        const leftEyeVertices = frontVertices
            .filter(({ vertex }) =>
                vertex.y > yUpperThird &&
                vertex.x < centerX - width * 0.1 &&
                vertex.x > centerX - width * 0.35
            )
            .map(({ index }) => index);

        const rightEyeVertices = frontVertices
            .filter(({ vertex }) =>
                vertex.y > yUpperThird &&
                vertex.x > centerX + width * 0.1 &&
                vertex.x < centerX + width * 0.35
            )
            .map(({ index }) => index);

        // Nose region (center, middle third)
        const noseVertices = frontVertices
            .filter(({ vertex }) =>
                vertex.y > yLowerThird &&
                vertex.y < yUpperThird &&
                Math.abs(vertex.x - centerX) < width * 0.1
            )
            .map(({ index }) => index);

        // Head center
        const headCenter = center.clone();

        return {
            mouthVertices,
            jawVertices,
            leftEyeVertices,
            rightEyeVertices,
            noseVertices,
            mouthCenter,
            jawPivot,
            headCenter,
            bounds
        };
    }

    /**
     * Calculate the center point of a set of vertices
     */
    private getVertexCenter(positions: THREE.BufferAttribute, indices: number[]): THREE.Vector3 {
        if (indices.length === 0) {
            return new THREE.Vector3();
        }

        const center = new THREE.Vector3();
        for (const idx of indices) {
            center.x += positions.getX(idx);
            center.y += positions.getY(idx);
            center.z += positions.getZ(idx);
        }
        center.divideScalar(indices.length);
        return center;
    }

    /**
     * Get detected landmarks
     */
    getLandmarks(): FacialLandmarks | null {
        return this.landmarks;
    }
}
