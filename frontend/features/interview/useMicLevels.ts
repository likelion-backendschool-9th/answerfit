"use client";

import { useEffect, useState } from "react";

const INTERVAL_MS = 120;

/** 최근 소리 크기(0~1). 오래된 것부터 최대 count개. active가 아니면 멈춘 채로 둔다 */
export function useMicLevels(stream: MediaStream | null, count: number, active = true) {
  const [levels, setLevels] = useState<number[]>([]);

  useEffect(() => {
    if (!stream || !active || stream.getAudioTracks().length === 0) return;
    const context = new AudioContext();
    void context.resume().catch(() => undefined);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      const power = samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length;
      const level = Math.min(1, Math.sqrt(power) * 4);
      setLevels((previous) => [...previous, level].slice(-count));
    }, INTERVAL_MS);
    return () => {
      clearInterval(timer);
      void context.close();
    };
  }, [stream, count, active]);

  return levels;
}
