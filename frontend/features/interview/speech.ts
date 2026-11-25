/** 한국어를 읽는 데 걸리는 시간 어림값 */
const MS_PER_CHARACTER = 130;
const MIN_MS = 3000;

/**
 * 브라우저 내장 음성으로 읽고, 다 읽으면 onEnd를 한 번 부른다. 멈추는 함수를 돌려준다.
 * 음성을 쓸 수 없으면 읽는 시간만큼 기다린 뒤 onEnd를 부른다.
 */
export function speak(text: string, onEnd: () => void) {
  const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
  const readingMs = Math.max(MIN_MS, text.length * MS_PER_CHARACTER);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    onEnd();
  };
  // 브라우저가 끝났다고 알려 주지 않는 경우에도 넘어간다
  let timer = setTimeout(finish, synth ? readingMs * 3 : readingMs);

  if (synth) {
    const startedAt = Date.now();
    const waitRest = () => {
      if (done) return;
      clearTimeout(timer);
      timer = setTimeout(finish, Math.max(0, readingMs - (Date.now() - startedAt)));
    };
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    // 음성이 없는 브라우저는 시작하자마자 끝났다고 알린다
    utterance.onend = () => (Date.now() - startedAt < 500 ? waitRest() : finish());
    utterance.onerror = waitRest;
    synth.cancel();
    synth.speak(utterance);
  }

  return () => {
    done = true;
    clearTimeout(timer);
    synth?.cancel();
  };
}
