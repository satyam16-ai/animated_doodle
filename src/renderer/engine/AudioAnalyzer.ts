export interface DetailedAudioAnalysis {
    volume: number;           // 0-1 overall RMS volume
    lowFreq: number;          // 0-1 bass energy (0-250 Hz)
    midFreq: number;          // 0-1 mid-range energy (250-2000 Hz)
    highFreq: number;         // 0-1 treble energy (2000+ Hz)
    zeroCrossingRate: number; // 0-1 rate of signal sign changes
}

export class AudioAnalyzer {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    private frequencyData: Uint8Array | null = null;
    private timeData: Uint8Array | null = null;
    public stream: MediaStream | null = null;
    private isListening: boolean = false;

    async start(deviceId?: string) {
        try {
            // Debug: List available devices to see what we're working with
            if (!deviceId && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                // Only list on first load or if no specific device requested
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                console.log('🎤 Available Audio Inputs:', audioInputs.map(d => `${d.label || 'Unknown'} (${d.deviceId})`));
            }

            // Stop existing stream if any
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop());
            }

            const constraints: any = {
                audio: deviceId ? { deviceId: { exact: deviceId } } : true,
                video: false
            };

            // Request audio stream
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Log which mic we actually got
            const track = this.stream.getAudioTracks()[0];
            if (track) {
                console.log(`🎤 Active Mic: "${track.label}" | Enabled: ${track.enabled} | Muted: ${track.muted} | ID: ${track.id}`);

                track.onended = () => console.warn('🎤 Microphone track ended unexpectedly');
                track.onmute = () => console.warn('🎤 Microphone track muted by system');
                track.onunmute = () => console.log('🎤 Microphone track unmuted');
            }

            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Resume audio context immediately if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const source = this.audioContext.createMediaStreamSource(this.stream);

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            source.connect(this.analyser);

            console.log(`🔊 AudioContext State: ${this.audioContext.state} | Sample Rate: ${this.audioContext.sampleRate}`);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.frequencyData = new Uint8Array(bufferLength);
            this.timeData = new Uint8Array(bufferLength);
            this.isListening = true;

        } catch (err) {
            console.error("❌ Audio init failed:", err);
        }
    }

    // Get a fresh stream for recording (cloned to prevent interference)
    getRecordingStream(): MediaStream | null {
        if (!this.stream) return null;
        return this.stream.clone();
    }

    /**
     * Get basic volume (backwards compatible)
     */
    getVolume(): number {
        if (!this.isListening || !this.analyser || !this.dataArray) return 0;

        this.analyser.getByteFrequencyData(this.dataArray as any);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;

        // Normalize (0-255 -> 0.0-1.0)
        const normalized = average / 128.0;
        return Math.min(Math.max(normalized, 0), 1);
    }

    /**
     * Get detailed audio analysis for viseme detection
     */
    getDetailedAnalysis(): DetailedAudioAnalysis {
        if (!this.isListening || !this.analyser || !this.frequencyData || !this.timeData) {
            return {
                volume: 0,
                lowFreq: 0,
                midFreq: 0,
                highFreq: 0,
                zeroCrossingRate: 0
            };
        }

        // Get frequency and time domain data
        this.analyser.getByteFrequencyData(this.frequencyData as any);
        this.analyser.getByteTimeDomainData(this.timeData as any);

        // Debug: Check if we are receiving any data
        if (this.timeData[0] === 0 && this.timeData[10] === 0 && this.timeData[100] === 0) {
            // Check a few points to see if it's dead silence (0 usually means uninitialized in ByteTimeDomain, 128 is silence)
            // Actually for ByteTimeDomainData, 128 is silence. 0 is -1 amplitude. 
            // If we get strictly 0 everywhere, something is wrong or it's clipping hard.
            // If we get strictly 0 in frequency data, it's silence.
            if (this.frequencyData[0] === 0 && this.frequencyData[50] === 0 && this.frequencyData[100] === 0) {
                // console.warn('Silence detected (Frequency data is 0)'); 
                // Uncommenting this would spam, but useful to know.
            }
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const sampleRate = this.audioContext!.sampleRate;
        const nyquist = sampleRate / 2;

        // Calculate RMS volume from time domain
        let sumSquares = 0;
        for (let i = 0; i < this.timeData.length; i++) {
            const normalized = (this.timeData[i] - 128) / 128.0;
            sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / this.timeData.length);
        const volume = Math.min(rms * 3, 1.0); // Amplify for better sensitivity

        // Calculate frequency band energies
        // Each bin represents: (sampleRate / fftSize) Hz
        const binWidth = nyquist / bufferLength;

        // Low frequencies: 0-250 Hz (bass, fundamental of voice)
        const lowBinEnd = Math.floor(250 / binWidth);
        let lowSum = 0;
        for (let i = 0; i < lowBinEnd && i < bufferLength; i++) {
            lowSum += this.frequencyData[i];
        }
        const lowFreq = lowSum / (lowBinEnd * 255);

        // Mid frequencies: 250-2000 Hz (vowels, resonance)
        const midBinStart = lowBinEnd;
        const midBinEnd = Math.floor(2000 / binWidth);
        let midSum = 0;
        for (let i = midBinStart; i < midBinEnd && i < bufferLength; i++) {
            midSum += this.frequencyData[i];
        }
        const midFreq = midSum / ((midBinEnd - midBinStart) * 255);

        // High frequencies: 2000+ Hz (consonants, sibilants)
        let highSum = 0;
        const highBinStart = midBinEnd;
        const highBinEnd = Math.min(bufferLength, Math.floor(8000 / binWidth)); // Cap at 8kHz
        for (let i = highBinStart; i < highBinEnd && i < bufferLength; i++) {
            highSum += this.frequencyData[i];
        }
        const highFreq = highSum / ((highBinEnd - highBinStart) * 255);

        // Calculate zero-crossing rate (distinguishes consonants from vowels)
        let zeroCrossings = 0;
        for (let i = 1; i < this.timeData.length; i++) {
            if ((this.timeData[i] >= 128 && this.timeData[i - 1] < 128) ||
                (this.timeData[i] < 128 && this.timeData[i - 1] >= 128)) {
                zeroCrossings++;
            }
        }
        const zeroCrossingRate = zeroCrossings / this.timeData.length;

        return {
            volume: Math.min(volume, 1.0),
            lowFreq: Math.min(lowFreq, 1.0),
            midFreq: Math.min(midFreq, 1.0),
            highFreq: Math.min(highFreq, 1.0),
            zeroCrossingRate: Math.min(zeroCrossingRate, 1.0)
        };
    }

    // Resume audio context (call on user interaction)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('Audio context resumed');
        }
    }
}
