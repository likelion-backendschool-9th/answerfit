"use client";

import { useEffect, useState } from "react";
import styles from "./SeoulClock.module.css";

const format = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** 서버 시각이 화면에 굳지 않도록 브라우저에서만 시각을 그린다 */
export function SeoulClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setTime(format.format(new Date()));
    const first = setTimeout(tick);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  return (
    <p className={styles.clock} aria-hidden="true">
      <span>SEOUL</span>
      <span>{time}</span>
      <span>·</span>
      <span>UTC+09</span>
    </p>
  );
}
