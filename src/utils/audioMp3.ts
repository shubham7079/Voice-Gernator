import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * Converts a base64 encoded audio string or ArrayBuffer (WAV) to an MP3 Blob.
 * If the input is already MP3, it wraps it in an audio/mp3 Blob directly.
 */
export function convertWavToMp3Blob(audioData: string | ArrayBuffer | Uint8Array): Blob {
  let uint8Array: Uint8Array;

  if (typeof audioData === 'string') {
    // Strip data URI prefix if present
    const base64Clean = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
    const binaryString = atob(base64Clean);
    uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
  } else if (audioData instanceof ArrayBuffer) {
    uint8Array = new Uint8Array(audioData);
  } else {
    uint8Array = audioData;
  }

  // Check if it's already an MP3 (starts with ID3 or MPEG sync 0xFF 0xFB/0xF3/0xF2)
  if (
    (uint8Array[0] === 0x49 && uint8Array[1] === 0x44 && uint8Array[2] === 0x33) ||
    (uint8Array[0] === 0xff && (uint8Array[1] & 0xe0) === 0xe0)
  ) {
    return new Blob([uint8Array as any], { type: 'audio/mp3' });
  }

  // Parse RIFF WAV header
  const view = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);

  let channels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataLength = uint8Array.byteLength - 44;

  try {
    if (
      uint8Array.byteLength >= 12 &&
      String.fromCharCode(
        uint8Array[0],
        uint8Array[1],
        uint8Array[2],
        uint8Array[3]
      ) === 'RIFF'
    ) {
      let offset = 12;
      while (offset < uint8Array.byteLength - 8) {
        const chunkId = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        );
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'fmt ') {
          channels = view.getUint16(offset + 10, true);
          sampleRate = view.getUint32(offset + 12, true);
          bitsPerSample = view.getUint16(offset + 22, true);
        } else if (chunkId === 'data') {
          dataOffset = offset + 8;
          dataLength = chunkSize;
          break;
        }

        offset += 8 + chunkSize;
      }
    }
  } catch (err) {
    console.warn('WAV header parse warning, using fallback 24kHz mono:', err);
    dataOffset = 44;
    dataLength = uint8Array.byteLength - 44;
  }

  // Ensure byte alignment for 16-bit PCM safely
  const bytesPerSample = Math.max(1, bitsPerSample / 8);
  const numSamples = Math.floor(dataLength / (channels * bytesPerSample));
  if (numSamples <= 0) {
    return new Blob([], { type: 'audio/mp3' });
  }

  // Extract Int16 samples via aligned buffer copy to prevent RangeError
  const byteCount = numSamples * channels * 2;
  const rawBytes = uint8Array.subarray(dataOffset, dataOffset + byteCount);
  const alignedBuffer = new ArrayBuffer(rawBytes.length);
  new Uint8Array(alignedBuffer).set(rawBytes);
  const samples = new Int16Array(alignedBuffer);

  const encoder = new Mp3Encoder(channels, sampleRate, 128);
  const mp3Chunks: Uint8Array[] = [];
  const sampleBlockSize = 1152;

  if (channels === 1) {
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const chunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(new Uint8Array(mp3buf));
      }
    }
  } else {
    const left = new Int16Array(numSamples);
    const right = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      left[i] = samples[i * 2];
      right[i] = samples[i * 2 + 1];
    }
    for (let i = 0; i < numSamples; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, i + sampleBlockSize);
      const rightChunk = right.subarray(i, i + sampleBlockSize);
      const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(new Uint8Array(mp3buf));
      }
    }
  }

  const end = encoder.flush();
  if (end.length > 0) {
    mp3Chunks.push(new Uint8Array(end));
  }

  return new Blob(mp3Chunks as any, { type: 'audio/mp3' });
}

/**
 * Downloads any audio source as a clean, standardized MP3 file.
 */
export function downloadAudioAsMp3(audioSrc: string, baseFilename: string): void {
  try {
    const mp3Blob = convertWavToMp3Blob(audioSrc);
    const blobUrl = URL.createObjectURL(mp3Blob);

    const cleanName =
      baseFilename
        .toLowerCase()
        .replace(/\.(wav|mp3|ogg|webm|m4a|aac)$/i, '')
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'speech_audio';

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${cleanName}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 10000);
  } catch (error) {
    console.error('Failed to convert and download as MP3:', error);
    // Direct fallback with mp3 extension
    const a = document.createElement('a');
    a.href = audioSrc;
    a.download = `${baseFilename.replace(/\.wav$/i, '')}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
