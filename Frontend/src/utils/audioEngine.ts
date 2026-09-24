// Web Audio API Binaural Resonance Engine

class BinauralAudioEngine {
  private ctx: AudioContext | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private noiseNode: AudioNode | null = null;
  private masterGain: GainNode | null = null;
  private isRunning: boolean = false;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  public start(baseFreq = 216, beatFreq = 9.4, noiseLevel = 0.05, volume = 0.4) {
    this.stop();
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const master = this.ctx.createGain();
    master.gain.setValueAtTime(volume, this.ctx.currentTime);
    master.connect(this.ctx.destination);
    this.masterGain = master;

    // Left channel: baseFreq
    const leftOsc = this.ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

    const leftMerger = this.ctx.createChannelMerger(2);
    const leftGain = this.ctx.createGain();
    leftGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    leftOsc.connect(leftGain);
    leftGain.connect(leftMerger, 0, 0); // connect to left channel

    // Right channel: baseFreq + beatFreq
    const rightOsc = this.ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(baseFreq + beatFreq, this.ctx.currentTime);

    const rightGain = this.ctx.createGain();
    rightGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    rightOsc.connect(rightGain);
    rightGain.connect(leftMerger, 0, 1); // connect to right channel

    leftMerger.connect(master);

    leftOsc.start();
    rightOsc.start();

    this.leftOsc = leftOsc;
    this.rightOsc = rightOsc;

    // Ambient soft pink noise buffer generator
    if (noiseLevel > 0) {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter for gentle atmospheric sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(noiseLevel, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);

      whiteNoise.start();
      this.noiseNode = whiteNoise;
    }

    this.isRunning = true;
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  public stop() {
    try {
      if (this.leftOsc) {
        this.leftOsc.stop();
        this.leftOsc.disconnect();
        this.leftOsc = null;
      }
      if (this.rightOsc) {
        this.rightOsc.stop();
        this.rightOsc.disconnect();
        this.rightOsc = null;
      }
      if (this.noiseNode) {
        (this.noiseNode as AudioScheduledSourceNode).stop?.();
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
    } catch {
      // Ignored
    }
    this.isRunning = false;
  }

  public getStatus() {
    return this.isRunning;
  }
}

export const audioEngine = new BinauralAudioEngine();
