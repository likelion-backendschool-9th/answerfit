"use client";

import { useEffect, useRef } from "react";
import { saveRecording } from "./recordings";

type Options = { stream: MediaStream | null; interviewId: string; questionId: string; state: "recording" | "paused" | "stopped" };

/** 질문마다 녹화 하나를 만든다. 멈추면 이어서 녹화하고, 끝나면 저장한다 */
export function useRecorder({ stream, interviewId, questionId, state }: Options) {
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const current = recorder.current;
    if (state === "recording" && stream && !current && typeof MediaRecorder !== "undefined") {
      const created = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      created.ondataavailable = ({ data }) => data.size > 0 && chunks.push(data);
      created.onstop = () => saveRecording(interviewId, questionId, new Blob(chunks, { type: created.mimeType }));
      created.start(1000);
      recorder.current = created;
    } else if (current && state === "recording" && current.state === "paused") current.resume();
    else if (current && state === "paused" && current.state === "recording") current.pause();
    else if (current && state === "stopped") {
      if (current.state !== "inactive") current.stop();
      recorder.current = null;
    }
  }, [stream, interviewId, questionId, state]);

  // 중간에 나가면 저장하지 않고 버린다
  useEffect(
    () => () => {
      const current = recorder.current;
      if (!current) return;
      current.onstop = null;
      if (current.state !== "inactive") current.stop();
      recorder.current = null;
    },
    [],
  );
}
