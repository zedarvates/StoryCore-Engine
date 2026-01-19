/**
 * Web Worker for waveform generation
 * Offloads expensive audio processing from main thread
 */

interface WaveformRequest {
  type: 'generate';
  audioData: Float32Array;
  samples: number;
}

interface WaveformResponse {
  type: 'complete' | 'error';
  waveformData?: number[];
  error?: string;
}

self.onmessage = (event: MessageEvent<WaveformRequest>) => {
  const { type, audioData, samples } = event.data;

  if (type === 'generate') {
    try {
      const waveformData = generateWaveform(audioData, samples);
      
      const response: WaveformResponse = {
        type: 'complete',
        waveformData,
      };
      
      self.postMessage(response);
    } catch (error) {
      const response: WaveformResponse = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      self.postMessage(response);
    }
  }
};

function generateWaveform(channelData: Float32Array, samples: number): number[] {
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let sum = 0;

    // Calculate RMS (Root Mean Square)
    for (let j = start; j < end && j < channelData.length; j++) {
      sum += channelData[j] * channelData[j];
    }

    const rms = Math.sqrt(sum / blockSize);
    waveform.push(rms);
  }

  // Normalize waveform data
  const max = Math.max(...waveform);
  return waveform.map((value) => (max > 0 ? value / max : 0));
}

export {};
