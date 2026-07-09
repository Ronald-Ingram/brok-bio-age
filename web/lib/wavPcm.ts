/** Extract mono PCM s16le chunks from a WAV buffer (for HeyGen agent.speak). */
export function wavToPcmS16leChunks(
  wav: Buffer,
  targetSampleRate = 24_000,
  chunkBytes = targetSampleRate * 2
): string[] {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("invalid_wav");
  }

  let offset = 12;
  let audioFormat = 1;
  let channels = 1;
  let sampleRate = 24_000;
  let bitsPerSample = 16;
  let dataStart = 44;
  let dataLen = wav.length - 44;

  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (id === "fmt ") {
      audioFormat = wav.readUInt16LE(chunkStart);
      channels = wav.readUInt16LE(chunkStart + 2);
      sampleRate = wav.readUInt32LE(chunkStart + 4);
      bitsPerSample = wav.readUInt16LE(chunkStart + 14);
    } else if (id === "data") {
      dataStart = chunkStart;
      dataLen = size;
    }
    offset = chunkStart + size + (size % 2);
  }

  const raw = wav.subarray(dataStart, dataStart + dataLen);
  let pcm = raw;

  if (audioFormat === 3 && bitsPerSample === 32) {
    const floats = new Float32Array(
      raw.buffer,
      raw.byteOffset,
      raw.byteLength / 4
    );
    const out = Buffer.alloc(floats.length * 2);
    for (let i = 0; i < floats.length; i++) {
      const s = Math.max(-1, Math.min(1, floats[i]!));
      out.writeInt16LE(Math.round(s * 32767), i * 2);
    }
    pcm = out;
  } else if (bitsPerSample !== 16) {
    throw new Error(`unsupported_wav_bits_${bitsPerSample}`);
  }

  if (channels === 2) {
    const mono = Buffer.alloc(pcm.length / 2);
    for (let i = 0; i < mono.length; i += 2) {
      const left = pcm.readInt16LE(i * 2);
      const right = pcm.readInt16LE(i * 2 + 2);
      mono.writeInt16LE(Math.round((left + right) / 2), i);
    }
    pcm = mono;
  }

  if (sampleRate !== targetSampleRate) {
    pcm = resamplePcm16(pcm, sampleRate, targetSampleRate);
  }

  const chunks: string[] = [];
  for (let i = 0; i < pcm.length; i += chunkBytes) {
    chunks.push(pcm.subarray(i, i + chunkBytes).toString("base64"));
  }
  return chunks.length ? chunks : [pcm.toString("base64")];
}

function resamplePcm16(
  pcm: Buffer,
  fromRate: number,
  toRate: number
): Buffer {
  const samples = pcm.length / 2;
  const outSamples = Math.max(1, Math.round((samples * toRate) / fromRate));
  const out = Buffer.alloc(outSamples * 2);
  for (let i = 0; i < outSamples; i++) {
    const srcPos = (i * fromRate) / toRate;
    const idx = Math.min(samples - 1, Math.floor(srcPos));
    out.writeInt16LE(pcm.readInt16LE(idx * 2), i * 2);
  }
  return out;
}