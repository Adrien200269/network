/**
 * Smooth Saxophone Music Engine using Web Audio API
 * Generates an authentic, sultry saxophone tone with breathiness, vibrato, delay,
 * and warm jazz chord accompaniment — zero external audio files required!
 */

class SaxophoneMusicEngine {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.isInitialized = false;
    this.masterGain = null;
    this.loopTimer = null;
    this.activeNodes = [];
  }

  init() {
    if (this.isInitialized) return;
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioCtxClass();

    // Master volume with smooth ramp
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);

    // Warm Stereo Delay & Reverb simulation
    this.delayNode = this.audioCtx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.38; // 380ms delay

    this.feedbackGain = this.audioCtx.createGain();
    this.feedbackGain.gain.value = 0.35; // 35% delay feedback

    this.delayFilter = this.audioCtx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 2200; // Warm delay tone

    // Wire delay loop
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.delayFilter.connect(this.masterGain);

    this.masterGain.connect(this.audioCtx.destination);
    this.isInitialized = true;
  }

  toggle() {
    this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Fade in master volume
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.35, now + 0.6);

    this.playLoop();
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // Fade out master volume smoothly
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    setTimeout(() => {
      this.stopAllActiveNodes();
    }, 550);
  }

  stopAllActiveNodes() {
    for (const node of this.activeNodes) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch (e) {}
    }
    this.activeNodes = [];
  }

  /**
   * Plays a single realistic Saxophone note with FM synthesis, breath noise, and delayed vibrato
   */
  playSaxNote(freq, startTime, duration, velocity = 0.8) {
    if (!this.isPlaying) return;
    const ctx = this.audioCtx;

    // 1. Carrier Oscillator (Tenor/Alto Sax core reed tone)
    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(freq, startTime);

    // 2. Modulator Oscillator (FM synthesis for reed bite & metallic richness)
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2, startTime); // 2nd harmonic bite

    const modGain = ctx.createGain();
    const modDepth = freq * 0.85;
    modGain.gain.setValueAtTime(modDepth, startTime);
    modGain.gain.exponentialRampToValueAtTime(modDepth * 0.35, startTime + duration);

    modulator.connect(carrier.frequency);

    // 3. Delayed Vibrato LFO (humanized saxophone style: starts after note is struck)
    const vibratoLfo = ctx.createOscillator();
    vibratoLfo.type = 'sine';
    vibratoLfo.frequency.setValueAtTime(5.3, startTime); // 5.3 Hz jazz vibrato

    const vibratoGain = ctx.createGain();
    vibratoGain.gain.setValueAtTime(0, startTime);
    // Ramp vibrato in after 220ms
    vibratoGain.gain.setValueAtTime(0, startTime + 0.22);
    vibratoGain.gain.linearRampToValueAtTime(freq * 0.022, startTime + 0.6); // ~2.2% pitch bend

    vibratoLfo.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // 4. Acoustic Resonant Filters (Modeling the Saxophone conical tube & bell)
    const bellFilter = ctx.createBiquadFilter();
    bellFilter.type = 'bandpass';
    bellFilter.frequency.setValueAtTime(1450, startTime);
    bellFilter.Q.setValueAtTime(2.2, startTime);

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(3400, startTime);
    bodyFilter.Q.setValueAtTime(1.1, startTime);

    // 5. Sax Amp Envelope (gentle brass attack, expressive swell, warm release)
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, startTime);
    // Attack: 65ms
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.65, startTime + 0.065);
    // Swell & Sustain
    noteGain.gain.linearRampToValueAtTime(velocity * 0.72, startTime + Math.min(0.4, duration * 0.6));
    // Release
    noteGain.gain.setValueAtTime(velocity * 0.72, startTime + duration - 0.08);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.12);

    // Wire Carrier -> Filters -> NoteGain
    carrier.connect(bellFilter);
    bellFilter.connect(bodyFilter);
    bodyFilter.connect(noteGain);

    // Connect to Master and to Delay Reverb
    noteGain.connect(this.masterGain);
    noteGain.connect(this.delayNode);

    // Start & Stop nodes
    carrier.start(startTime);
    modulator.start(startTime);
    vibratoLfo.start(startTime);

    const stopTime = startTime + duration + 0.2;
    carrier.stop(stopTime);
    modulator.stop(stopTime);
    vibratoLfo.stop(stopTime);

    this.activeNodes.push(carrier, modulator, vibratoLfo, noteGain);
  }

  /**
   * Warm Electric Piano / Jazz Pad chord accompaniment
   */
  playJazzChord(chordFreqs, startTime, duration, velocity = 0.18) {
    if (!this.isPlaying) return;
    const ctx = this.audioCtx;

    for (const freq of chordFreqs) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(velocity, startTime + 0.2);
      gain.gain.setValueAtTime(velocity, startTime + duration - 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.5);

      this.activeNodes.push(osc, gain);
    }
  }

  /**
   * The Full Smooth Saxophone Groove (Iconic Careless Whisper riff + chords)
   */
  playLoop() {
    if (!this.isPlaying) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime + 0.08;

    // Pitch Frequencies
    const D4 = 293.66;
    const F4 = 349.23;
    const G4 = 392.00;
    const A4 = 440.00;
    const Bb4 = 466.16;
    const C5 = 523.25;
    const D5 = 587.33;
    const E5 = 659.25;
    const F5 = 698.46;

    // Accompaniment Chords (Dm7 -> Gm7 -> Bbmaj7 -> A7)
    // Bar 1 & 2: Dm9
    this.playJazzChord([146.83, 220.00, 261.63, 329.63], now, 3.8, 0.14);
    // Bar 3 & 4: Gm9
    this.playJazzChord([196.00, 233.08, 293.66, 349.23], now + 4.0, 3.8, 0.14);
    // Bar 5 & 6: Bbmaj7
    this.playJazzChord([116.54, 174.61, 220.00, 261.63], now + 8.0, 3.8, 0.14);
    // Bar 7 & 8: A7sus4 -> A7
    this.playJazzChord([110.00, 164.81, 196.00, 293.66], now + 12.0, 3.8, 0.14);

    // 🎷 The Iconic Saxophone Hook Sequence (carefully timed)
    const saxNotes = [
      // Measure 1: D5 (sustained sensual cry)
      { f: D5, t: 0.00, d: 1.10, v: 0.95 },
      { f: C5, t: 1.20, d: 0.38, v: 0.85 },
      { f: Bb4, t: 1.62, d: 0.40, v: 0.85 },
      { f: A4, t: 2.08, d: 0.70, v: 0.90 },
      { f: F4, t: 2.85, d: 0.35, v: 0.80 },
      { f: G4, t: 3.25, d: 0.55, v: 0.85 },

      // Measure 2: Gm phrase
      { f: A4, t: 4.00, d: 0.75, v: 0.90 },
      { f: Bb4, t: 4.80, d: 0.38, v: 0.85 },
      { f: C5, t: 5.22, d: 0.42, v: 0.85 },
      { f: D5, t: 5.70, d: 0.90, v: 0.92 },
      { f: C5, t: 6.70, d: 0.45, v: 0.80 },
      { f: Bb4, t: 7.20, d: 0.65, v: 0.85 },

      // Measure 3: Bbmaj7 phrase
      { f: A4, t: 8.00, d: 0.85, v: 0.90 },
      { f: G4, t: 8.90, d: 0.38, v: 0.85 },
      { f: F4, t: 9.32, d: 0.40, v: 0.85 },
      { f: G4, t: 9.78, d: 0.80, v: 0.90 },
      { f: D4, t: 10.65, d: 0.45, v: 0.80 },
      { f: F4, t: 11.15, d: 0.65, v: 0.85 },

      // Measure 4: A7 resolution
      { f: G4, t: 12.00, d: 0.75, v: 0.88 },
      { f: F4, t: 12.80, d: 0.38, v: 0.82 },
      { f: E5, t: 13.22, d: 0.45, v: 0.85 },
      { f: D5, t: 13.75, d: 1.85, v: 0.98 } // Long final sweet note
    ];

    for (const note of saxNotes) {
      this.playSaxNote(note.f, now + note.t, note.d, note.v);
    }

    // Schedule next loop iteration (16 seconds total groove loop)
    const loopDurationMs = 16000;
    this.loopTimer = setTimeout(() => {
      if (this.isPlaying) {
        this.playLoop();
      }
    }, loopDurationMs);
  }
}

window.SaxophoneMusicEngine = SaxophoneMusicEngine;
