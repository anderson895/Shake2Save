// Generates a loud repeating alarm beep tone as a WAV data URI
// No external audio file needed — pure programmatic generation

export function generateAlarmWavUri(): string {
  const sampleRate = 44100;
  const durationSec = 3; // 3 seconds of alarm
  const totalSamples = sampleRate * durationSec;

  // Create PCM audio data (16-bit mono)
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, totalSamples * 2, true);

  // Generate alarm pattern:
  // 800Hz beep for 300ms → silence 150ms → 1000Hz beep for 300ms → silence 150ms (repeat)
  const beepFreqs = [800, 1000];
  const beepDuration = 0.3; // seconds
  const silenceDuration = 0.15; // seconds
  const cycleLength = (beepDuration + silenceDuration) * 2;
  const amplitude = 0.9;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const cyclePos = t % cycleLength;

    let sample = 0;

    if (cyclePos < beepDuration) {
      // First beep (800Hz)
      sample = Math.sin(2 * Math.PI * beepFreqs[0] * t) * amplitude;
    } else if (cyclePos < beepDuration + silenceDuration) {
      // Silence
      sample = 0;
    } else if (cyclePos < beepDuration * 2 + silenceDuration) {
      // Second beep (1000Hz) — higher pitch for urgency
      sample = Math.sin(2 * Math.PI * beepFreqs[1] * t) * amplitude;
    } else {
      // Silence
      sample = 0;
    }

    // Add slight fade in/out to avoid clicks
    const beep1Start = 0;
    const beep1End = beepDuration;
    const beep2Start = beepDuration + silenceDuration;
    const beep2End = beepDuration * 2 + silenceDuration;
    const fadeMs = 0.005;

    if (cyclePos >= beep1Start && cyclePos < beep1Start + fadeMs) {
      sample *= (cyclePos - beep1Start) / fadeMs;
    } else if (cyclePos > beep1End - fadeMs && cyclePos <= beep1End) {
      sample *= (beep1End - cyclePos) / fadeMs;
    } else if (cyclePos >= beep2Start && cyclePos < beep2Start + fadeMs) {
      sample *= (cyclePos - beep2Start) / fadeMs;
    } else if (cyclePos > beep2End - fadeMs && cyclePos <= beep2End) {
      sample *= (beep2End - cyclePos) / fadeMs;
    }

    // Convert to 16-bit PCM
    const pcmValue = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, pcmValue * 32767, true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Use btoa for base64 encoding
  const base64 = btoa(binary);
  return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
