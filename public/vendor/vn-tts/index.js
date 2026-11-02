// src/wav.ts
function floatToUint8(samples) {
  const result = new Uint8Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    result[i] = Math.floor((samples[i] + 1) * 127.5);
  }
  return result;
}
function addWavHeader(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeString(36, "data");
  view.setUint32(40, samples.length, true);
  const result = new Uint8Array(buffer);
  result.set(samples, 44);
  return result;
}

// src/synthesize.ts
var DEFAULT_BASE_FREQUENCY = 250;
var DEFAULT_PITCH = 1;
var DEFAULT_SPEED = 1;
var DEFAULT_SAMPLE_RATE = 8e3;
var DEFAULT_VOWEL_VOLUME = 0.4;
var DEFAULT_CONSONANT_VOLUME = 0.3;
function clampMultiplier(value, fallback) {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(4, Math.max(0.25, value));
}
function scaleDurationMs(durationMs, speed) {
  return Math.max(5, durationMs / speed);
}
function generateBeep(frequency, durationMs, sampleRate, volume = 0.5) {
  const numSamples = Math.floor(durationMs / 1e3 * sampleRate);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let envelope = 1;
    const attackSamples = Math.floor(sampleRate * 0.01);
    const releaseSamples = Math.floor(sampleRate * 0.02);
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i > numSamples - releaseSamples) {
      envelope = (numSamples - i) / releaseSamples;
    }
    samples[i] = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
  }
  return samples;
}
function isVowel(char) {
  return /[aeiouAEIOU]/.test(char);
}
function getFrequencyForChar(char, baseFreq) {
  const charCode = char.toLowerCase().charCodeAt(0);
  if (isVowel(char)) {
    return baseFreq + charCode % 50;
  }
  if (/[bcdfghjklmnpqrstvwxyz]/i.test(char)) {
    return baseFreq - 30 + charCode % 40;
  }
  return baseFreq;
}
function synthesizePcm(options) {
  const { text, baseFrequency, pitch, speed, sampleRate, vowelVolume, consonantVolume } = options;
  const effectiveBaseFrequency = baseFrequency * pitch;
  const allSamples = [];
  const cleanedText = text.replace(/[^a-zA-Z ]/g, " ").trim();
  if (cleanedText.length === 0) {
    const silenceLength = Math.floor(sampleRate * 0.1);
    return {
      pcm: addWavHeader(new Uint8Array(silenceLength).fill(127), sampleRate),
      sampleRate,
      durationMs: 100
    };
  }
  for (const char of cleanedText) {
    if (char === " ") {
      const gapMs = scaleDurationMs(50, speed);
      allSamples.push(new Float32Array(Math.floor(gapMs / 1e3 * sampleRate)));
      continue;
    }
    const freq = getFrequencyForChar(char, effectiveBaseFrequency);
    const isV = isVowel(char);
    const baseDuration = isV ? 80 + char.charCodeAt(0) % 40 : 30 + char.charCodeAt(0) % 20;
    const duration = scaleDurationMs(baseDuration, speed);
    const volume = isV ? vowelVolume : consonantVolume;
    allSamples.push(generateBeep(freq, duration, sampleRate, volume));
    const charGapMs = scaleDurationMs(20, speed);
    allSamples.push(new Float32Array(Math.floor(charGapMs / 1e3 * sampleRate)));
  }
  const totalLength = allSamples.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Float32Array(totalLength);
  let offset = 0;
  for (const samples of allSamples) {
    combined.set(samples, offset);
    offset += samples.length;
  }
  const uint8Samples = floatToUint8(combined);
  const audio = addWavHeader(uint8Samples, sampleRate);
  const durationMs = Math.round(totalLength / sampleRate * 1e3);
  return { pcm: audio, sampleRate, durationMs };
}
function synthesize(options) {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const { pcm, durationMs } = synthesizePcm({
    text: options.text,
    baseFrequency: options.baseFrequency ?? DEFAULT_BASE_FREQUENCY,
    pitch: clampMultiplier(options.pitch ?? DEFAULT_PITCH, DEFAULT_PITCH),
    speed: clampMultiplier(options.speed ?? DEFAULT_SPEED, DEFAULT_SPEED),
    sampleRate,
    vowelVolume: options.vowelVolume ?? DEFAULT_VOWEL_VOLUME,
    consonantVolume: options.consonantVolume ?? DEFAULT_CONSONANT_VOLUME
  });
  return {
    audio: pcm,
    mimeType: "audio/wav",
    sampleRate,
    durationMs
  };
}
function synthesizeToArrayBuffer(options) {
  const { audio } = synthesize(options);
  return audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength);
}
function synthesizeToBlob(options) {
  const buffer = synthesizeToArrayBuffer(options);
  return new Blob([buffer], { type: "audio/wav" });
}
function createObjectUrl(options) {
  return URL.createObjectURL(synthesizeToBlob(options));
}
export {
  createObjectUrl,
  synthesize,
  synthesizeToArrayBuffer,
  synthesizeToBlob
};
