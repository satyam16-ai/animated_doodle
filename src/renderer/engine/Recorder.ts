import { AudioAnalyzer } from './AudioAnalyzer';

export class Recorder {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private canvas: HTMLCanvasElement;
    private audioAnalyzer: AudioAnalyzer;
    private stream: MediaStream | null = null;

    constructor(canvas: HTMLCanvasElement, audioAnalyzer: AudioAnalyzer) {
        this.canvas = canvas;
        this.audioAnalyzer = audioAnalyzer;
    }

    start() {
        this.recordedChunks = [];

        // Get Canvas Stream at 30 FPS
        const canvasStream = this.canvas.captureStream(30);
        console.log('Canvas stream tracks:', canvasStream.getTracks().length);

        // Get a fresh cloned Audio Stream for recording
        const audioStream = this.audioAnalyzer.getRecordingStream();

        // Combine tracks
        const tracks = [...canvasStream.getVideoTracks()];
        if (audioStream && audioStream.getAudioTracks().length > 0) {
            const audioTracks = audioStream.getAudioTracks();
            console.log('Audio tracks for recording:', audioTracks.length, audioTracks.map(t => t.label));
            tracks.push(...audioTracks);
        } else {
            console.warn('No audio tracks available! Audio will not be recorded.');
        }

        this.stream = new MediaStream(tracks);
        console.log('Combined stream tracks:', this.stream.getTracks().map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));

        // Try different codecs for better compatibility
        let mimeType = 'video/webm;codecs=vp8,opus';

        if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.log('vp8,opus not supported, trying vp8 only');
            mimeType = 'video/webm;codecs=vp8';
        }

        if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.log('vp8 not supported, using default webm');
            mimeType = 'video/webm';
        }

        console.log('Using MIME type:', mimeType);

        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType,
            videoBitsPerSecond: 2500000, // 2.5 Mbps
            audioBitsPerSecond: 128000,  // 128 kbps audio
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
                console.log('Recorded chunk:', event.data.size, 'bytes');
            }
        };

        this.mediaRecorder.start(100); // Collect data every 100ms
        console.log("Recording started with", tracks.length, "tracks (video + audio)");
    }

    stop(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject("No recorder");
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, {
                    type: 'video/webm'
                });
                console.log("Recording finished, blob size:", blob.size, "bytes");
                resolve(blob);
            };

            this.mediaRecorder.stop();

            // Stop all tracks
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
        });
    }
}
