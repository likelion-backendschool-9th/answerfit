"use client";

import { useCallback, useEffect, useState } from "react";

export type CameraStatus = "pending" | "ready" | "denied" | "missing";
type Camera = { status: CameraStatus; stream: MediaStream | null; cameraName: string; micName: string };

const EMPTY: Camera = { status: "pending", stream: null, cameraName: "", micName: "" };

const statusOf = (error: unknown): CameraStatus => (error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "missing");

/** 카메라와 마이크를 켠다. 화면을 떠나면 끈다 */
export function useCamera() {
  const [camera, setCamera] = useState(EMPTY);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let left = false;
    let opened: MediaStream | null = null;
    const open = async () => {
      if (!navigator.mediaDevices) throw new Error("이 브라우저는 카메라를 지원하지 않아요.");
      return navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
    };
    open()
      .then((stream) => {
        if (left) return stream.getTracks().forEach((track) => track.stop());
        opened = stream;
        setCamera({ status: "ready", stream, cameraName: stream.getVideoTracks()[0]?.label ?? "", micName: stream.getAudioTracks()[0]?.label ?? "" });
      })
      .catch((error) => {
        if (!left) setCamera({ ...EMPTY, status: statusOf(error) });
      });
    return () => {
      left = true;
      opened?.getTracks().forEach((track) => track.stop());
      setCamera(EMPTY);
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...camera, retry };
}
