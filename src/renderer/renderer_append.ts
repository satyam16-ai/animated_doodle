
        // --- 3D Model Import ---
        const import3DBtn = document.getElementById('import-3d-btn') as HTMLButtonElement;
        const modelFileInput = document.getElementById('model-file-input') as HTMLInputElement;
        const modelFilename = document.getElementById('model-filename') as HTMLElement;

        import3DBtn?.addEventListener('click', () => {
            modelFileInput.click();
        });

        modelFileInput?.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            // Validate file type
            const validExtensions = ['.glb', '.gltf'];
            const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            
            if (!validExtensions.includes(fileExt)) {
                alert('Please select a GLB or GLTF file');
                return;
            }

            // Validate file size (50MB max)
            const maxSize = 50 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('File size exceeds 50MB limit');
                return;
            }

            try {
                modelFilename.textContent = `Loading: ${file.name}`;
                modelFilename.style.display = 'block';

                const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
                const loader = new GLTFLoader();
                const url = URL.createObjectURL(file);
                
                loader.load(
                    url,
                    (gltf) => {
                        console.log('✅ Model loaded:', gltf);
                        if (currentRenderer && currentRenderer.setAvatarModel) {
                            currentRenderer.setAvatarModel(gltf.scene);
                            modelFilename.textContent = `✅ ${file.name}`;
                            modelFilename.style.color = '#2ed573';
                        }
                        URL.revokeObjectURL(url);
                    },
                    (progress) => {
                        const percent = (progress.loaded / progress.total * 100).toFixed(0);
                        modelFilename.textContent = `Loading: ${percent}%`;
                    },
                    (error) => {
                        console.error('❌ Model load error:', error);
                        modelFilename.textContent = `❌ Failed`;
                        modelFilename.style.color = '#ff4757';
                        URL.revokeObjectURL(url);
                    }
                );
            } catch (err) {
                console.error('Import error:', err);
                alert(`Failed to import: ${err}`);
            }
        });

