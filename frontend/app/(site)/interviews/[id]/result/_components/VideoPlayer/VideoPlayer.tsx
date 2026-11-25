"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { CameraStage } from "@/features/interview/components/CameraStage/CameraStage";
import { recordingUrl } from "@/features/interview/recordings";
import type { ResultItem } from "@/features/interview/result";
import { clock } from "@/features/interview/room";
import styles from "./VideoPlayer.module.css";

/** 질문 하나의 녹화. 이 탭에서 녹화한 영상만 재생할 수 있다 */
export function VideoPlayer({ interviewId, item }: { interviewId: string; item: ResultItem }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [notice, setNotice] = useState("");
  const url = recordingUrl(interviewId, item.id);
  // 브라우저가 만든 녹화에는 길이 정보가 없어 답변 시간을 쓴다
  const total = Math.max(item.seconds, 1);

  function toggle() {
    const element = video.current;
    if (!element) return setNotice("영상이 이 탭에 없어요. 영상 저장은 아직 준비 중이에요.");
    if (element.paused) void element.play().catch(() => setNotice("영상을 재생하지 못했어요."));
    else element.pause();
  }

  return (
    <div className={styles.player}>
      {url ? (
        <video
          ref={video}
          className={styles.video}
          src={url}
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        />
      ) : (
        <CameraStage stream={null} className={styles.stage} />
      )}
      <button type="button" className={playing ? styles.surface : styles.play} aria-label={playing ? "영상 멈추기" : "영상 재생"} onClick={toggle}>
        {!playing && <Icon name="play" />}
      </button>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <div className={styles.controls}>
        <span className={styles.time}>
          {clock(Math.floor(Math.min(position, total)))} / {clock(item.seconds)}
        </span>
        <input
          type="range"
          className={styles.range}
          aria-label="재생 위치"
          min={0}
          max={total}
          step={0.1}
          value={Math.min(position, total)}
          disabled={!url}
          onChange={(event) => {
            const next = Number(event.target.value);
            setPosition(next);
            if (video.current) video.current.currentTime = next;
          }}
        />
        {url ? (
          <a href={url} download={`${item.label}.webm`} className={styles.download} aria-label="영상 내려받기">
            <Icon name="download" size={20} />
          </a>
        ) : (
          <button type="button" className={styles.download} aria-label="영상 내려받기" onClick={() => setNotice("영상이 이 탭에 없어요. 영상 저장은 아직 준비 중이에요.")}>
            <Icon name="download" size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
