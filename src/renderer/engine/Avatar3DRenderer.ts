import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FaceState } from './FaceTracker';
import { VisemeState } from './VisemeEngine';
import { FaceDetector3D, FacialLandmarks } from './FaceDetector3D';
import { MorphTargetAnimator } from './MorphTargetAnimator';
import { DefaultFaceModel } from './DefaultFaceModel';

/**
 * Avatar3DRenderer - Main 3D rendering engine for avatar models
 * Handles scene setup, model loading, and animation
 */
export class Avatar3DRenderer {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private model: THREE.Object3D | null = null;
    private animator: MorphTargetAnimator | null = null;
    private faceDetector: FaceDetector3D;
    private landmarks: FacialLandmarks | null = null;

    // Lighting
    private lights: THREE.Light[] = [];

    // Settings
    private cameraDistance: number = 2;
    private lightIntensity: number = 1;
    private modelScale: number = 1;
    private targetResolution = { width: 1920, height: 1080 };

    // Animation
    private frameCount = 0;
    private lastTime = performance.now();
    private fps = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.faceDetector = new FaceDetector3D();

        // Initialize Three.js renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.targetResolution.width, this.targetResolution.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Initialize scene
        this.scene = new THREE.Scene();

        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            50, // FOV
            this.targetResolution.width / this.targetResolution.height,
            0.1,
            1000
        );
        this.camera.position.z = this.cameraDistance;

        // Setup lighting
        this.setupLighting();

        // Load default face model
        this.loadDefaultFace();

        // Start render loop
        this.animate();

        console.log('📦 Avatar3DRenderer initialized with default face');
    }

    /**
     * Setup three-point lighting
     */
    private setupLighting() {
        // Key light (main light source)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0 * this.lightIntensity);
        keyLight.position.set(2, 3, 5);
        this.lights.push(keyLight);
        this.scene.add(keyLight);

        // Fill light (softer, from the side)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4 * this.lightIntensity);
        fillLight.position.set(-3, 1, 2);
        this.lights.push(fillLight);
        this.scene.add(fillLight);

        // Back light (rim light)
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3 * this.lightIntensity);
        backLight.position.set(0, 3, -3);
        this.lights.push(backLight);
        this.scene.add(backLight);

        // Ambient light (overall brightness)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5 * this.lightIntensity);
        this.lights.push(ambientLight);
        this.scene.add(ambientLight);
    }

    /**
     * Load default face model (shown when no model is imported)
     */
    private loadDefaultFace() {
        console.log('📦 Loading default face model...');

        // Create default face using primitives
        const defaultFace = DefaultFaceModel.createFace();

        // Remove old model if exists
        if (this.model) {
            this.scene.remove(this.model);
        }

        // Add default face
        this.model = defaultFace;
        this.scene.add(this.model);

        // Set default landmarks (for animation)
        this.landmarks = DefaultFaceModel.createLandmarks() as any;

        // Create a custom animator for the default face
        // We'll handle animation in updateViseme for the default model
        this.animator = null; // Will use custom animation

        console.log('✅ Default face model loaded');
    }

    /**
     * Load a 3D model from file
     */
    async loadModel(file: File): Promise<boolean> {
        const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        const url = URL.createObjectURL(file);

        try {
            console.log(`📦 Loading ${fileExt} model: ${file.name}`);

            let loadedObject: THREE.Object3D;

            if (fileExt === '.glb' || fileExt === '.gltf') {
                loadedObject = await this.loadGLTF(url);
            } else if (fileExt === '.fbx') {
                loadedObject = await this.loadFBX(url);
            } else if (fileExt === '.obj') {
                loadedObject = await this.loadOBJ(url);
            } else {
                throw new Error(`Unsupported file format: ${fileExt}`);
            }

            // Remove old model
            if (this.model) {
                this.scene.remove(this.model);
            }

            // Add new model
            this.model = loadedObject;
            this.scene.add(this.model);

            // Apply scale
            this.model.scale.setScalar(this.modelScale);

            // Center the model
            this.centerModel();

            // Detect facial landmarks
            console.log('🔍 Detecting facial features...');
            this.landmarks = await this.faceDetector.detectFace(this.model);

            if (this.landmarks) {
                console.log('✅ Face detected!');
                console.log('   - Mouth vertices:', this.landmarks.mouthVertices.length);
                console.log('   - Jaw vertices:', this.landmarks.jawVertices?.length || 0);

                // Create animator
                const mesh = this.findMainMesh(this.model);
                if (mesh) {
                    // Check for morph targets
                    const morphTargets = mesh.morphTargetDictionary;
                    const hasMorphTargets = morphTargets && Object.keys(morphTargets).length > 0;
                    console.log('   - Morph targets:', hasMorphTargets ? Object.keys(morphTargets).join(', ') : 'None');

                    // Check for bones
                    const hasBones = (mesh as any).skeleton && (mesh as any).skeleton.bones.length > 0;
                    console.log('   - Bones:', hasBones ? `${(mesh as any).skeleton?.bones.length} bones` : 'None');

                    this.animator = new MorphTargetAnimator(mesh, this.landmarks);
                    console.log('✅ Animator created successfully');

                    if (!hasMorphTargets && !hasBones) {
                        console.warn('⚠️ Model has no morph targets or bones - will use vertex deformation (may be limited)');
                    }
                } else {
                    console.warn('⚠️ Could not find mesh for animation');
                }
            } else {
                console.warn('⚠️ Could not detect facial features - animation may be limited');
            }

            URL.revokeObjectURL(url);
            console.log('✅ Model loaded successfully');
            return true;

        } catch (error) {
            console.error('❌ Model load error:', error);
            URL.revokeObjectURL(url);
            return false;
        }
    }

    /**
     * Load GLTF/GLB model
     */
    private loadGLTF(url: string): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(
                url,
                (gltf) => resolve(gltf.scene),
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Load FBX model
     */
    private loadFBX(url: string): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            const loader = new FBXLoader();
            loader.load(
                url,
                (object) => resolve(object),
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Load OBJ model
     */
    private loadOBJ(url: string): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            const loader = new OBJLoader();
            loader.load(
                url,
                (object) => resolve(object),
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Find main mesh in object hierarchy
     */
    private findMainMesh(object: THREE.Object3D): THREE.Mesh | null {
        if (object instanceof THREE.Mesh) {
            return object;
        }

        for (const child of object.children) {
            const mesh = this.findMainMesh(child);
            if (mesh) return mesh;
        }

        return null;
    }

    /**
     * Center the model in the scene
     */
    private centerModel() {
        if (!this.model) return;

        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center the model
        this.model.position.sub(center);

        // Adjust camera to fit model
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Add some margin

        this.camera.position.z = cameraZ * this.cameraDistance;
    }

    /**
     * Update model based on face tracking state
     */
    updateState(state: FaceState) {
        if (!this.model) return;

        if (this.animator) {
            // Use animator for imported models
            this.animator.applyHeadRotation(state.rotation);
        } else if (this.model.name === 'DefaultFace') {
            // Custom head rotation for default face model
            DefaultFaceModel.applyHeadRotation(this.model as THREE.Group, state.rotation);
        }
    }

    /**
     * Update viseme (lip sync)
     */
    updateViseme(visemeState: VisemeState) {
        if (this.animator) {
            // Use animator for imported models
            this.animator.applyViseme(visemeState);
        } else if (this.model && this.model.name === 'DefaultFace') {
            // Custom animation for default face model
            const openAmount = visemeState.intensity || 0;
            DefaultFaceModel.animateMouth(this.model as THREE.Group, openAmount);
        }
    }

    /**
     * Set camera distance
     */
    setCameraDistance(distance: number) {
        this.cameraDistance = distance;
        if (this.model) {
            this.centerModel(); // Recalculate camera position
        }
    }

    /**
     * Set light intensity
     */
    setLightIntensity(intensity: number) {
        this.lightIntensity = intensity;

        // Update all lights
        if (this.lights.length >= 4) {
            (this.lights[0] as THREE.DirectionalLight).intensity = 1.0 * intensity;
            (this.lights[1] as THREE.DirectionalLight).intensity = 0.4 * intensity;
            (this.lights[2] as THREE.DirectionalLight).intensity = 0.3 * intensity;
            (this.lights[3] as THREE.AmbientLight).intensity = 0.5 * intensity;
        }
    }

    /**
     * Set model scale
     */
    setModelScale(scale: number) {
        this.modelScale = scale;
        if (this.model) {
            this.model.scale.setScalar(scale);
        }
    }

    /**
     * Set background style
     */
    setBackground(style: string) {
        switch (style) {
            case 'gradient':
                this.scene.background = new THREE.Color(0x2f2448);
                break;
            case 'solid-dark':
                this.scene.background = new THREE.Color(0x1a1a2e);
                break;
            case 'solid-light':
                this.scene.background = new THREE.Color(0xf5f5f5);
                break;
            case 'green':
                this.scene.background = new THREE.Color(0x00ff00);
                break;
            case 'blue':
                this.scene.background = new THREE.Color(0x0000ff);
                break;
            default:
                this.scene.background = new THREE.Color(0x2f2448);
        }
    }

    /**
     * Set resolution
     */
    setResolution(width: number, height: number) {
        this.targetResolution = { width, height };
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Animation loop
     */
    private animate = () => {
        requestAnimationFrame(this.animate);

        // Update FPS counter
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Get current FPS
     */
    getFPS(): number {
        return this.fps;
    }

    /**
     * Check if model is loaded
     */
    hasModel(): boolean {
        return this.model !== null;
    }

    /**
     * Get landmarks
     */
    getLandmarks(): FacialLandmarks | null {
        return this.landmarks;
    }

    /**
     * Dispose and cleanup
     */
    dispose() {
        if (this.model) {
            this.scene.remove(this.model);
        }
        this.renderer.dispose();
    }
}
