import * as THREE from 'three';

/**
 * DefaultFaceModel - "Munna Hero" V4
 * A truly stylish, cohesive character design with high-quality geometry.
 */
export class DefaultFaceModel {
    static createFace(): THREE.Group {
        const character = new THREE.Group();
        character.name = 'DefaultFace';

        const skinColor = 0xffdcb1; // Warmer, healthier skin tone
        const skinMat = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.6,
            metalness: 0.05
        });

        // === 1. HEAD (Sculpted Shape) ===
        // Using a sphere but scaling it to look like a jaw -> forehead shape
        const headGeo = new THREE.SphereGeometry(1, 48, 48);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.scale.set(0.92, 1.15, 0.95); // Taller, slightly narrow
        head.name = 'head';
        character.add(head);

        // === 2. EYES (Expressive & Detailed) ===
        this.createHeroEyes(character);

        // === 3. BROWS (Styled) ===
        this.createHeroBrows(character);

        // === 4. NOSE (Sculpted, not a ball) ===
        this.createHeroNose(character, skinMat);

        // === 5. MOUTH (Integrated look) ===
        this.createHeroMouth(character);

        // === 6. HAIR (K-Pop / Anime Style - Full Coverage) ===
        this.createHeroHair(character);

        // === 7. NECK ===
        const neckGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.8, 24);
        const neck = new THREE.Mesh(neckGeo, skinMat);
        neck.position.y = -0.95;
        character.add(neck);

        // === 8. EARS (Detailed) ===
        this.createHeroEars(character, skinMat);

        return character;
    }

    private static createHeroEyes(character: THREE.Group) {
        const eyeSpacing = 0.32;
        const eyeY = 0.12;
        const eyeZ = 0.82;

        for (let side of [-1, 1]) {
            const eyeGroup = new THREE.Group();
            eyeGroup.position.set(side * eyeSpacing, eyeY, eyeZ);

            // 1. White
            const scleraGeo = new THREE.SphereGeometry(0.24, 32, 32);
            const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
            const sclera = new THREE.Mesh(scleraGeo, scleraMat);
            sclera.scale.set(1, 1, 0.6);
            eyeGroup.add(sclera);

            // 2. Iris (Gradient texture simulated by ring + circle)
            const irisGroup = new THREE.Group();
            irisGroup.position.z = 0.19;

            const irisColor = 0x2b86d6; // Deep Blue
            const irisGeo = new THREE.CircleGeometry(0.13, 32);
            const irisMat = new THREE.MeshStandardMaterial({ color: irisColor, roughness: 0.3 });
            const iris = new THREE.Mesh(irisGeo, irisMat);
            irisGroup.add(iris);

            // 3. Pupil
            const pupilGeo = new THREE.CircleGeometry(0.065, 32);
            const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.z = 0.005;
            irisGroup.add(pupil);

            // 4. Highlight (Vital for life)
            const glareGeo = new THREE.CircleGeometry(0.04, 16);
            const glareMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const glare = new THREE.Mesh(glareGeo, glareMat);
            glare.position.set(0.06, 0.06, 0.01);
            irisGroup.add(glare);

            eyeGroup.add(irisGroup);

            // 5. Upper Eyelid (Lid shape)
            const lidSkinMat = new THREE.MeshStandardMaterial({ color: 0xeebc95, roughness: 0.6 }); // Slightly darker skin
            const lidGeo = new THREE.SphereGeometry(0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4);
            const lid = new THREE.Mesh(lidGeo, lidSkinMat);
            lid.rotation.x = -Math.PI / 2.5; // Angled down
            lid.scale.set(1.05, 1.05, 1.05);
            eyeGroup.add(lid);

            // 6. Eyelash Line (Thick dark line)
            const lashGeo = new THREE.TorusGeometry(0.24, 0.015, 8, 24, Math.PI);
            const lashMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
            const lash = new THREE.Mesh(lashGeo, lashMat);
            lash.rotation.x = -Math.PI / 3;
            lash.rotation.z = Math.PI; // Arch up
            lash.position.y = 0.05;
            lash.position.z = 0.05;
            eyeGroup.add(lash);

            character.add(eyeGroup);
        }
    }

    private static createHeroBrows(character: THREE.Group) {
        const browMat = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 0.95 }); // Dark brown/black

        for (let side of [-1, 1]) {
            // Tapered Brow Shape
            const browGeo = new THREE.CapsuleGeometry(0.045, 0.35, 4, 8);
            const brow = new THREE.Mesh(browGeo, browMat);

            brow.position.set(side * 0.35, 0.42, 0.88);
            brow.rotation.z = Math.PI / 2 + (side * 0.15); // Gentle arch
            brow.rotation.y = -side * 0.15; // Wrap around head slighty
            brow.rotation.x = -0.1;

            character.add(brow);
        }
    }

    private static createHeroNose(character: THREE.Group, skinMat: THREE.Material) {
        const noseGroup = new THREE.Group();
        noseGroup.position.set(0, -0.1, 1.0);

        // Bridge
        const bridgeGeo = new THREE.CapsuleGeometry(0.08, 0.25, 4, 8);
        const bridge = new THREE.Mesh(bridgeGeo, skinMat);
        bridge.position.y = 0.15;
        bridge.position.z = -0.05;
        bridge.rotation.x = -0.2;
        noseGroup.add(bridge);

        // Tip (Softly blended)
        const tipGeo = new THREE.SphereGeometry(0.1, 32, 32);
        const tip = new THREE.Mesh(tipGeo, skinMat);
        tip.scale.set(1, 0.8, 1);
        noseGroup.add(tip);

        character.add(noseGroup);
    }

    private static createHeroMouth(character: THREE.Group) {
        const mouthGroup = new THREE.Group();
        mouthGroup.name = 'mouth';
        mouthGroup.position.set(0, -0.42, 0.95);

        const lipColor = 0xd68989; // Natural lip tone
        const lipMat = new THREE.MeshStandardMaterial({ color: lipColor, roughness: 0.5 });
        const caveMat = new THREE.MeshBasicMaterial({ color: 0x4a2a2a });

        // Upper Lip (Bow shape)
        const uLipGeo = new THREE.TorusGeometry(0.18, 0.05, 12, 24, Math.PI * 0.8);
        const uLip = new THREE.Mesh(uLipGeo, lipMat);
        uLip.rotation.z = Math.PI * 1.6; // Arch down
        uLip.position.y = 0.05;
        uLip.scale.y = 0.6; // Flatten arch
        uLip.name = 'upperLip';
        mouthGroup.add(uLip);

        // Lower Lip (Full)
        const lLipGeo = new THREE.CapsuleGeometry(0.06, 0.2, 4, 12);
        const lLip = new THREE.Mesh(lLipGeo, lipMat);
        lLip.rotation.z = Math.PI / 2;
        lLip.position.y = -0.05;
        lLip.name = 'lowerLip';
        mouthGroup.add(lLip);

        // Cavity
        const holeGeo = new THREE.CircleGeometry(0.15, 16);
        const hole = new THREE.Mesh(holeGeo, caveMat);
        hole.position.z = -0.1;
        hole.name = 'cavity';
        mouthGroup.add(hole);

        // Teeth
        const teethGeo = new THREE.BoxGeometry(0.2, 0.06, 0.02);
        const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const teeth = new THREE.Mesh(teethGeo, teethMat);
        teeth.position.set(0, 0.04, -0.05);
        teeth.visible = false;
        teeth.name = 'upperTeeth';
        mouthGroup.add(teeth);

        character.add(mouthGroup);
    }

    private static createHeroHair(character: THREE.Group) {
        const hairColor = 0x1e1510; // Soft Black/Dark Brown
        const hairMat = new THREE.MeshStandardMaterial({
            color: hairColor,
            roughness: 0.7,
            flatShading: false
        });

        const hairGroup = new THREE.Group();
        hairGroup.name = 'hair';

        // 1. Base Cap (Covers scalp)
        const capGeo = new THREE.SphereGeometry(1.02, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const cap = new THREE.Mesh(capGeo, hairMat);
        cap.position.y = 0.1;
        cap.rotation.x = -0.2; // Tilt back slightly
        hairGroup.add(cap);

        // 2. Front Bangs (Large, chunky anime style strands)
        const bangGeo = new THREE.ConeGeometry(0.25, 0.8, 16);

        // Center Bang
        const bang1 = new THREE.Mesh(bangGeo, hairMat);
        bang1.position.set(0, 0.85, 0.85);
        bang1.rotation.x = 2.5; // Point down/forward
        hairGroup.add(bang1);

        // Left Bang
        const bang2 = new THREE.Mesh(bangGeo, hairMat);
        bang2.position.set(-0.4, 0.8, 0.75);
        bang2.rotation.x = 2.2;
        bang2.rotation.z = 0.5; // Flair out
        hairGroup.add(bang2);

        // Right Bang
        const bang3 = new THREE.Mesh(bangGeo, hairMat);
        bang3.position.set(0.4, 0.8, 0.75);
        bang3.rotation.x = 2.2;
        bang3.rotation.z = -0.5;
        hairGroup.add(bang3);

        // 3. Sideburns (Thick styling)
        const sideGeo = new THREE.CapsuleGeometry(0.22, 0.6, 4, 8);
        for (let side of [-1, 1]) {
            const sideburn = new THREE.Mesh(sideGeo, hairMat);
            sideburn.position.set(side * 0.95, 0.1, 0.3);
            sideburn.rotation.z = side * 0.2;
            hairGroup.add(sideburn);
        }

        // 4. Top Volume (Messy spikes)
        const spikeGeo = new THREE.ConeGeometry(0.3, 0.6, 16);
        const spike1 = new THREE.Mesh(spikeGeo, hairMat);
        spike1.position.set(0, 1.25, 0);
        spike1.rotation.x = -0.2;
        hairGroup.add(spike1);

        const spike2 = new THREE.Mesh(spikeGeo, hairMat);
        spike2.position.set(-0.5, 1.1, -0.2);
        spike2.rotation.z = 0.5;
        hairGroup.add(spike2);

        const spike3 = new THREE.Mesh(spikeGeo, hairMat);
        spike3.position.set(0.5, 1.1, -0.2);
        spike3.rotation.z = -0.5;
        hairGroup.add(spike3);

        character.add(hairGroup);
    }

    private static createHeroEars(character: THREE.Group, skinMat: THREE.Material) {
        for (let side of [-1, 1]) {
            const earGeo = new THREE.SphereGeometry(0.2, 24, 24);
            const ear = new THREE.Mesh(earGeo, skinMat);
            ear.scale.set(0.5, 1.3, 0.8);
            ear.position.set(side * 0.95, 0.05, -0.1);
            ear.rotation.y = -side * 0.4; // Angle back
            ear.rotation.z = -side * 0.1;

            // Detail inside ear
            const innerGeo = new THREE.SphereGeometry(0.12, 16, 16);
            const innerMat = new THREE.MeshStandardMaterial({ color: 0xcf9e76, roughness: 0.8 }); // Darker interior
            const inner = new THREE.Mesh(innerGeo, innerMat);
            inner.position.x = side * 0.1;
            inner.scale.set(0.5, 1, 0.5);
            ear.add(inner);

            character.add(ear);
        }
    }

    static animateMouth(faceGroup: THREE.Group, openAmount: number) {
        const mouth = faceGroup.getObjectByName('mouth');
        // const upperLip = mouth?.getObjectByName('upperLip');
        const lowerLip = mouth?.getObjectByName('lowerLip');
        const cavity = mouth?.getObjectByName('cavity');
        const teeth = mouth?.getObjectByName('upperTeeth');

        // Jaw Drop Logic
        if (openAmount > 0.02) {
            const scaleY = openAmount * 0.6;
            if (lowerLip) {
                lowerLip.position.y = -0.05 - (scaleY * 0.4);
                // Slightly thin the lip as it stretches
                lowerLip.scale.y = 1 - (scaleY * 0.2);
            }
            if (cavity) {
                cavity.scale.y = (openAmount * 3) + 0.2;
                cavity.position.y = -0.05 - (scaleY * 0.2);
            }
            if (teeth) teeth.visible = openAmount > 0.15;
        } else {
            if (lowerLip) lowerLip.position.y = -0.05;
            if (teeth) teeth.visible = false;
        }
    }

    static applyHeadRotation(faceGroup: THREE.Group, rotation: { x: number; y: number; z: number }) {
        faceGroup.rotation.x = rotation.x * 0.6;
        faceGroup.rotation.y = rotation.y * 0.6;
        faceGroup.rotation.z = rotation.z * 0.3;

        // Dynamic Hair Bounce (Optional fun detail)
        const hair = faceGroup.getObjectByName('hair');
        if (hair) {
            hair.rotation.x = rotation.x * 0.1; // Lag
            hair.rotation.y = rotation.y * 0.05;
        }
    }

    static createLandmarks() {
        return {
            mouthVertices: [],
            jawVertices: [],
            leftEyeVertices: [],
            rightEyeVertices: [],
            noseVertices: [],
            mouthCenter: new THREE.Vector3(0, -0.42, 0.95),
            jawPivot: new THREE.Vector3(0, -0.5, 0),
            headCenter: new THREE.Vector3(0, 0, 0),
            bounds: { min: new THREE.Vector3(-1, -1.5, -1), max: new THREE.Vector3(1, 1.5, 1) }
        };
    }
}
