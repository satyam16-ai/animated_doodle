export class SpeechIntegrator {
    private recognition: any | null = null;
    private isSpeaking: boolean = false;
    private lastSpeechTime: number = 0;

    constructor() {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                console.log('🎤 Speech Recognition Started');
            };

            this.recognition.onresult = (event: any) => {
                this.isSpeaking = true;
                this.lastSpeechTime = Date.now();
                // We could use event.results[0][0].transcript for advanced phoneme mapping later
            };

            this.recognition.onend = () => {
                // Auto-restart
                if (this.recognition) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        // Ignore
                    }
                }
            };
        } else {
            console.warn('Speech Recognition API not supported');
        }
    }

    start() {
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (e) {
                console.log('Speech recognition already started');
            }
        }
    }

    getIsSpeaking(): boolean {
        // Consider speaking if result received within last 300ms
        if (Date.now() - this.lastSpeechTime > 300) {
            this.isSpeaking = false;
        }
        return this.isSpeaking;
    }
}
