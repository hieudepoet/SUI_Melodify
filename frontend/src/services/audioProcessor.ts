// Audio Processing Service
// For generating previews, extracting metadata, and processing audio files

/**
 * Generate a 30-second preview from an audio file
 * @param audioFile Original audio file
 * @returns Preview audio blob (first 30 seconds)
 */
export async function generatePreview(audioFile: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fileReader = new FileReader();

    fileReader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Calculate preview duration (30 seconds or full duration if shorter)
        const previewDuration = Math.min(30, audioBuffer.duration);
        const sampleRate = audioBuffer.sampleRate;
        const numberOfChannels = audioBuffer.numberOfChannels;
        const previewLength = Math.floor(previewDuration * sampleRate);

        // Create preview buffer
        const previewBuffer = audioContext.createBuffer(
          numberOfChannels,
          previewLength,
          sampleRate
        );

        // Copy first 30 seconds of audio data
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = audioBuffer.getChannelData(channel);
          const previewData = previewBuffer.getChannelData(channel);
          
          for (let i = 0; i < previewLength; i++) {
            previewData[i] = channelData[i];
          }
        }

        // Convert AudioBuffer to WAV Blob
        const wavBlob = audioBufferToWav(previewBuffer);
        
        console.log('[AudioProcessor] Preview generated:', {
          originalDuration: audioBuffer.duration,
          previewDuration,
          originalSize: audioFile.size,
          previewSize: wavBlob.size,
        });

        resolve(wavBlob);
      } catch (error) {
        reject(new Error(`Failed to generate preview: ${(error as Error).message}`));
      }
    };

    fileReader.onerror = () => {
      reject(new Error('Failed to read audio file'));
    };

    fileReader.readAsArrayBuffer(audioFile);
  });
}

/**
 * Convert AudioBuffer to WAV Blob
 * @param audioBuffer Audio buffer to convert
 * @returns WAV blob
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const data = interleave(audioBuffer);
  const dataLength = data.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write audio data
  floatTo16BitPCM(view, 44, data);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Interleave audio channels
 */
function interleave(audioBuffer: AudioBuffer): Float32Array {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numberOfChannels;
  const result = new Float32Array(length);

  let inputIndex = 0;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      result[inputIndex++] = audioBuffer.getChannelData(channel)[i];
    }
  }

  return result;
}

/**
 * Convert float samples to 16-bit PCM
 */
function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

/**
 * Write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Get audio file duration without full decode
 * @param audioFile Audio file
 * @returns Duration in seconds
 */
export async function getAudioDuration(audioFile: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(audioFile);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load audio metadata'));
    };

    audio.src = objectUrl;
  });
}

/**
 * Validate audio file
 * @param file File to validate
 * @returns Validation result
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm)$/i)) {
    return {
      valid: false,
      error: 'Invalid audio format. Supported: MP3, WAV, OGG, WebM',
    };
  }

  // Check file size (max 50MB for MVP)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}
