export const createWavFromPCM = (pcmData: Uint8Array): ArrayBuffer => {
  console.log("🎵 Creating WAV from PCM data, length:", pcmData.length);
  
  // Convert bytes to 16-bit samples (little endian)
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }
  
  // Create WAV header
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // WAV header parameters
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, int16Data.byteLength, true);

  // Combine header and data
  const wavArray = new ArrayBuffer(wavHeader.byteLength + int16Data.byteLength);
  const wavView = new Uint8Array(wavArray);
  wavView.set(new Uint8Array(wavHeader), 0);
  wavView.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
  
  console.log("✅ WAV created, total size:", wavArray.byteLength);
  return wavArray;
};

export class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    console.log("🎵 AudioQueue initialized");
  }

  async addToQueue(audioData: Uint8Array) {
    console.log("➕ Adding audio to queue, length:", audioData.length);
    this.queue.push(audioData);
    
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      console.log("🔇 Audio queue empty, stopping playback");
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;
    console.log("▶️ Playing next audio chunk, remaining in queue:", this.queue.length);

    try {
      const wavData = createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        console.log("✅ Audio chunk finished playing");
        this.playNext();
      };
      
      source.start(0);
      console.log("🎵 Audio chunk started playing, duration:", audioBuffer.duration);
    } catch (error) {
      console.error("❌ Error playing audio chunk:", error);
      this.playNext(); // Continue with next segment even if current fails
    }
  }

  clear() {
    console.log("🗑️ Clearing audio queue");
    this.queue = [];
    this.isPlaying = false;
  }
}

let audioQueueInstance: AudioQueue | null = null;

export const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array) => {
  if (!audioQueueInstance) {
    audioQueueInstance = new AudioQueue(audioContext);
  }
  await audioQueueInstance.addToQueue(audioData);
};

export const clearAudioQueue = () => {
  if (audioQueueInstance) {
    audioQueueInstance.clear();
  }
};