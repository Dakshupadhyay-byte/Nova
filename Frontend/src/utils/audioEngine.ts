// Web Audio API Ambient Sound Engine

class BinauralAudioEngine {
  private ctx: AudioContext | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private leftMerger: ChannelMergerNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isRunning: boolean = false;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  public start(baseFreq = 216, beatFreq = 10, noiseLevel = 0.05, volume = 0.4) {
    this.stop();
    this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
      master.connect(this.ctx.destination);
      this.masterGain = master;

      // Left channel
      const leftOsc = this.ctx.createOscillator();
      leftOsc.type = 'sine';
      leftOsc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

      const leftMerger = this.ctx.createChannelMerger(2);
      const leftGain = this.ctx.createGain();
      leftGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      leftOsc.connect(leftGain);
      leftGain.connect(leftMerger, 0, 0);

      // Right channel
      const rightOsc = this.ctx.createOscillator();
      rightOsc.type = 'sine';
      rightOsc.frequency.setValueAtTime(baseFreq + beatFreq, this.ctx.currentTime);

      const rightGain = this.ctx.createGain();
      rightGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      rightOsc.connect(rightGain);
      rightGain.connect(leftMerger, 0, 1);

      leftMerger.connect(master);

      leftOsc.start();
      rightOsc.start();

      this.leftOsc = leftOsc;
      this.rightOsc = rightOsc;
      this.leftGain = leftGain;
      this.rightGain = rightGain;
      this.leftMerger = leftMerger;

      // Ambient soft atmospheric noise
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
        this.noiseFilter = filter;
        this.noiseGain = noiseGain;
      }

      this.isRunning = true;
    } catch (e) {
      console.warn('[AUDIO ENGINE] Error starting audio:', e);
    }
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  public stop() {
    try {
      if (this.leftOsc) {
        try { this.leftOsc.stop(); } catch {}
        try { this.leftOsc.disconnect(); } catch {}
        this.leftOsc = null;
      }
      if (this.rightOsc) {
        try { this.rightOsc.stop(); } catch {}
        try { this.rightOsc.disconnect(); } catch {}
        this.rightOsc = null;
      }
      if (this.leftGain) {
        try { this.leftGain.disconnect(); } catch {}
        this.leftGain = null;
      }
      if (this.rightGain) {
        try { this.rightGain.disconnect(); } catch {}
        this.rightGain = null;
      }
      if (this.leftMerger) {
        try { this.leftMerger.disconnect(); } catch {}
        this.leftMerger = null;
      }
      if (this.noiseNode) {
        try { this.noiseNode.stop(); } catch {}
        try { this.noiseNode.disconnect(); } catch {}
        this.noiseNode = null;
      }
      if (this.noiseFilter) {
        try { this.noiseFilter.disconnect(); } catch {}
        this.noiseFilter = null;
      }
      if (this.noiseGain) {
        try { this.noiseGain.disconnect(); } catch {}
        this.noiseGain = null;
      }
      if (this.masterGain) {
        try { this.masterGain.disconnect(); } catch {}
        this.masterGain = null;
      }
      if (this.ctx && this.ctx.state === 'running') {
        try { this.ctx.suspend(); } catch {}
      }
    } catch (e) {
      console.warn('[AUDIO ENGINE] Error stopping audio:', e);
    }
    this.isRunning = false;
  }

  public getStatus() {
    return this.isRunning;
  }
}

export const audioEngine = new BinauralAudioEngine();
