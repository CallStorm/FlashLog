export type AudioLevelMeter = {
  getLevel: () => number;
  getBandLevels: (barCount: number) => number[];
  dispose: () => void;
};

function readFrequencyData(analyser: AnalyserNode, data: Uint8Array) {
  analyser.getByteFrequencyData(data);
}

export async function createAudioLevelMeter(
  stream: MediaStream,
): Promise<AudioLevelMeter> {
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.65;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);

  return {
    getLevel() {
      readFrequencyData(analyser, data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const avg = sum / data.length;
      return Math.min(1, avg / 128);
    },
    getBandLevels(barCount: number) {
      readFrequencyData(analyser, data);
      const count = Math.max(1, barCount);
      const bands: number[] = [];
      const binSize = data.length / count;

      for (let b = 0; b < count; b++) {
        const start = Math.floor(b * binSize);
        const end = Math.floor((b + 1) * binSize);
        let sum = 0;
        let len = 0;
        for (let i = start; i < end && i < data.length; i++) {
          sum += data[i];
          len++;
        }
        const avg = len > 0 ? sum / len : 0;
        bands.push(Math.min(1, avg / 128));
      }
      return bands;
    },
    dispose() {
      source.disconnect();
      void ctx.close();
    },
  };
}
