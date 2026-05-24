/**
 * Phase 18 Premium: Ambient Soundscape Audio Synthesizer
 * 
 * Maps Holly's active HSL emotional color profiles, stress matrices, and big five
 * traits into dynamic, low-frequency, therapeutic ambient synthesizer chord structures.
 * Feeds client-side Web Audio synths behind the LiveKit stream.
 */

export interface SoundscapeParameters {
  baseCarrierFrequency: number; // base synth note (e.g. 432Hz or 220Hz)
  harmonicNodes: number[];      // list of resonant node frequencies
  chordNotes: string[];        // musical chord notation (e.g. ['C3', 'G3', 'C4', 'E4'])
  synthType: 'sine' | 'triangle' | 'sawtooth';
  tempoBpm: number;
  glideDurationSec: number;
  ambienceVolumeDb: number;      // target sound level (negative number)
}

/**
 * Map active psychological traits and emotions to a warm, ambient Web Audio profile
 */
export function getAmbientSoundscape(
  emotionalState: string = 'neutral',
  energyLevel: number = 0.6
): SoundscapeParameters {
  const normalizedState = emotionalState.toLowerCase();

  // Baseline warm drone (tuned to 432Hz restorative resonant scale)
  let baseFreq = 216.0; // A3 octave down (216Hz for 432Hz harmony)
  let harmonics = [1.0, 1.5, 2.0, 3.0]; // root, fifth, octave, octave-fifth
  let chords = ['A3', 'E4', 'A4', 'C#5']; // Warm A major pad
  let synth: SoundscapeParameters['synthType'] = 'sine';
  let tempo = 60;
  let glide = 3.0;
  let volume = -24; // subtle background mix

  // Map emotions dynamically
  if (normalizedState.includes('creative') || normalizedState.includes('inspired')) {
    // Creative & Inspired: Luminous, rich harmonic structure (F major Lydian chord block)
    baseFreq = 174.6; // F3
    harmonics = [1.0, 1.5, 1.875, 2.0]; // root, fifth, major seventh, octave
    chords = ['F3', 'C4', 'E4', 'A4'];
    synth = 'triangle'; // softer, flute-like tone
    tempo = 72;
    glide = 4.0;
    volume = -20; // slightly more presence
  } else if (normalizedState.includes('focused') || normalizedState.includes('reflective')) {
    // Focused & Reflective: Low deep sine chord block (432Hz base frequency)
    baseFreq = 162.0; // E3 (resonant at 432Hz scale)
    harmonics = [1.0, 1.333, 1.5, 2.0]; // root, fourth, fifth, octave
    chords = ['E3', 'B3', 'E4', 'G#4'];
    synth = 'sine'; // pure deep tones
    tempo = 50;
    glide = 5.0;
    volume = -26; // deep background quiet drone
  } else if (normalizedState.includes('stressed') || normalizedState.includes('anxious')) {
    // Stress Relief: Calming ultra-low 110Hz sine wave drone to lower blood pressure
    baseFreq = 110.0; // A2
    harmonics = [1.0, 1.5, 2.0, 2.5]; // low root, soft fifths
    chords = ['A2', 'E3', 'A3', 'C#4'];
    synth = 'sine';
    tempo = 40; // very slow, breathing rhythm
    glide = 6.0; // slow attack transitions
    volume = -22;
  } else if (normalizedState.includes('warm') || normalizedState.includes('intimate')) {
    // Warm and Intimate: Soft triangle major 9th progression
    baseFreq = 261.6; // C4
    harmonics = [1.0, 1.2, 1.5, 1.875]; // root, third, fifth, seventh
    chords = ['C4', 'E4', 'G4', 'B4'];
    synth = 'triangle';
    tempo = 65;
    glide = 3.5;
    volume = -22;
  }

  // Adjust volume dynamically by energy levels
  if (energyLevel > 0.8) {
    volume += 2; // raise level slightly for excited vibes
  } else if (energyLevel < 0.4) {
    volume -= 3; // dim background levels for sleepy/low-energy vibes
  }

  return {
    baseCarrierFrequency: baseFreq,
    harmonicNodes: harmonics,
    chordNotes: chords,
    synthType: synth,
    tempoBpm: tempo,
    glideDurationSec: glide,
    ambienceVolumeDb: volume
  };
}
