import './styles/index.css'
import { FaceTracker } from './engine/FaceTracker';
import { AvatarRenderer } from './engine/AvatarRenderer';
import { AudioAnalyzer } from './engine/AudioAnalyzer';
import { AvatarStateEngine } from './engine/AvatarStateEngine';
import { Recorder } from './engine/Recorder';

console.log('🎨 Antigravity Renderer Process Started');


async function init() {
    const statusElement = document.getElementById('status')!;
    const videoElement = document.getElementById('input-video') as HTMLVideoElement;
    const canvasElement = document.getElementById('output-canvas') as HTMLCanvasElement;
    const skeletonCanvas = document.getElementById('skeleton-canvas') as HTMLCanvasElement;
    const previewContainer = document.getElementById('preview-container')!;
    const showPreviewCheckbox = document.getElementById('show-preview') as HTMLInputElement;

    const btnStart = document.getElementById('btn-start-record') as HTMLButtonElement;
    const btnStop = document.getElementById('btn-stop-record') as HTMLButtonElement;
    const btnExport = document.getElementById('btn-export') as HTMLButtonElement;

    if (!videoElement || !canvasElement) {
        statusElement.innerText = "Error: Missing DOM elements.";
        return;
    }

    try {
        statusElement.innerText = "🔧 Initializing Engine...";
        console.log("Initializing Antigravity Engine...");

        // Setup Audio Analyzer
        const audioAnalyzer = new AudioAnalyzer();

        // Setup State Engine
        const stateEngine = new AvatarStateEngine(audioAnalyzer);

        // Setup Avatar Renderer
        const avatarRenderer = new AvatarRenderer(canvasElement);

        // Setup Face Tracker with skeleton overlay
        const tracker = new FaceTracker(videoElement, (faceState) => {
            stateEngine.updateFaceState(faceState);
            const finalState = stateEngine.getState();
            avatarRenderer.updateState(finalState);
        }, skeletonCanvas);

        statusElement.innerText = "📷 Requesting Camera & Microphone...";

        // Start Camera & Audio
        await Promise.all([
            tracker.start(),
            audioAnalyzer.start()
        ]);

        // Populate Audio Selector
        const audioSelect = document.getElementById('audio-source') as HTMLSelectElement;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');

        // Clear and populate
        audioSelect.innerHTML = '';
        audioInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${audioSelect.length + 1}`;
            audioSelect.appendChild(option);
        });

        // Select active device if possible
        const currentStream = audioAnalyzer.stream;
        if (currentStream) {
            const currentTrack = currentStream.getAudioTracks()[0];
            if (currentTrack) {
                // Find device ID matching this track settings is hard, but usually 
                // the first one or implicit default is selected.
                // We will rely on user changing it. 
                // Actually, let's select the one that matches the label roughly
                const match = audioInputs.find(d => d.label === currentTrack.label);
                if (match) audioSelect.value = match.deviceId;
            }
        }

        // Handle Change
        audioSelect.onchange = async () => {
            const deviceId = audioSelect.value;
            console.log('🔄 Switching Microphone to:', deviceId);
            await audioAnalyzer.start(deviceId);
            // Engine automatically picks up new analyzer state
        };

        // Setup skeleton canvas size
        skeletonCanvas.width = videoElement.videoWidth;
        skeletonCanvas.height = videoElement.videoHeight;

        statusElement.innerText = "✅ Ready! Move your head and speak.";

        // Preview toggle
        showPreviewCheckbox.addEventListener('change', () => {
            if (showPreviewCheckbox.checked) {
                previewContainer.classList.remove('hidden');
            } else {
                previewContainer.classList.add('hidden');
            }
        });

        // Munna Monitor is now the default avatar - no customization needed!
        console.log('🎬 Munna Monitor avatar loaded and ready!');

        // Wire up export settings
        const resolutionSelect = document.getElementById('resolution-select') as HTMLSelectElement;
        const backgroundSelect = document.getElementById('background-select') as HTMLSelectElement;

        resolutionSelect.onchange = () => {
            const [width, height] = resolutionSelect.value.split('x').map(Number);
            avatarRenderer.setResolution(width, height);
            console.log(`📐 Resolution changed to: ${width}x${height}`);
        };



        backgroundSelect.onchange = () => {
            avatarRenderer.setBackground(backgroundSelect.value);
            console.log(`🎨 Background changed to: ${backgroundSelect.value}`);
        };

        // --- Avatar Creator Logic ---
        const bindColor = (id: string, key: keyof typeof avatarRenderer.config.colors) => {
            const input = document.getElementById(id) as HTMLInputElement;
            if (input) {
                input.oninput = () => {
                    avatarRenderer.config.colors[key] = input.value;
                };
            }
        };

        const bindStyle = (id: string, key: keyof typeof avatarRenderer.config.style) => {
            const select = document.getElementById(id) as HTMLSelectElement;
            if (select) {
                select.onchange = () => {
                    (avatarRenderer.config.style as any)[key] = select.value;
                };
            }
        };

        // Bind Colors
        bindColor('color-skin', 'skin');
        bindColor('color-hair', 'hair');
        bindColor('color-shirt', 'shirt');
        bindColor('color-headphones', 'headphones');

        // Bind Styles
        bindStyle('style-hair', 'hairStyle');
        bindStyle('style-glasses', 'glasses');
        bindStyle('style-headphones', 'headphones');


        // Recording Logic
        const recorder = new Recorder(canvasElement, audioAnalyzer);
        let recordedBlob: Blob | null = null;
        let recordingStartTime = 0;
        let recordingInterval: number | null = null;

        btnStart.onclick = async () => {
            // Resume audio context on user interaction (required by some browsers)
            await audioAnalyzer.resume();

            recorder.start();
            btnStart.disabled = true;
            btnStop.disabled = false;
            btnExport.disabled = true;
            recordingStartTime = Date.now();

            document.getElementById('app')!.classList.add('recording');

            // Update status with recording time
            recordingInterval = window.setInterval(() => {
                const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
                const mins = Math.floor(elapsed / 60);
                const secs = elapsed % 60;
                statusElement.innerText = `⏺ Recording... ${mins}:${secs.toString().padStart(2, '0')}`;
            }, 1000);
        };

        btnStop.onclick = async () => {
            if (recordingInterval) {
                clearInterval(recordingInterval);
                recordingInterval = null;
            }

            statusElement.innerText = "⏸ Stopping recording...";
            recordedBlob = await recorder.stop();

            btnStart.disabled = false;
            btnStop.disabled = true;
            btnExport.disabled = false;

            document.getElementById('app')!.classList.remove('recording');

            const size = (recordedBlob.size / 1024 / 1024).toFixed(2);
            statusElement.innerText = `✅ Recording complete! (${size} MB)`;
        };

        btnExport.onclick = async () => {
            if (!recordedBlob) return;

            statusElement.innerText = "💾 Exporting to MP4...";
            btnExport.disabled = true;

            try {
                const buffer = await recordedBlob.arrayBuffer();

                // Try MP4 export first
                const result = await (window as any).electronAPI.saveVideo(buffer);

                if (result.success) {
                    statusElement.innerText = `✅ Saved to: ${result.path}`;

                    setTimeout(() => {
                        statusElement.innerText = "✅ Ready! Move your head and speak.";
                    }, 3000);
                } else {
                    // FFmpeg failed, try WebM export
                    console.log('MP4 export failed, trying WebM:', result.message);
                    statusElement.innerText = "⚠️ MP4 failed, saving as WebM...";

                    const webmResult = await (window as any).electronAPI.saveVideoWebM(buffer);

                    if (webmResult.success) {
                        statusElement.innerText = `✅ Saved as WebM: ${webmResult.path}`;
                        setTimeout(() => {
                            statusElement.innerText = "✅ Ready! (Note: Install FFmpeg for MP4 export)";
                        }, 4000);
                    } else {
                        statusElement.innerText = `❌ Export failed: ${webmResult.message}`;
                    }
                }
            } catch (err) {
                console.error('Export error:', err);
                statusElement.innerText = `❌ Export error: ${err}`;
            } finally {
                btnExport.disabled = false;
            }
        };

        // Global click handler to ensure AudioContext execution
        document.body.addEventListener('click', async () => {
            if (audioAnalyzer) {
                await audioAnalyzer.resume();
                console.log('👆 User interaction: Audio resumed');
            }
        }, { once: true });

        statusElement.innerText = "✅ Ready! Move your head and speak. (Click anywhere if audio is 0%)";

    } catch (err) {
        console.error('Initialization error:', err);
        statusElement.innerText = `❌ Error: ${err}`;
    }
}

init();
