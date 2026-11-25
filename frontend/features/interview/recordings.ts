/** 질문별 녹화. 저장 API가 정해지기 전까지 이 탭의 메모리에만 둔다 */
const recordings = new Map<string, Blob>();
const urls = new Map<string, string>();
const key = (interviewId: string, questionId: string) => `${interviewId}/${questionId}`;

export function saveRecording(interviewId: string, questionId: string, recording: Blob) {
  forget(key(interviewId, questionId));
  recordings.set(key(interviewId, questionId), recording);
}

/** 재생과 내려받기에 쓰는 주소. 녹화가 없으면 null. 같은 녹화에는 같은 주소를 준다 */
export function recordingUrl(interviewId: string, questionId: string) {
  const name = key(interviewId, questionId);
  const recording = recordings.get(name);
  if (!recording) return null;
  const url = urls.get(name) ?? URL.createObjectURL(recording);
  urls.set(name, url);
  return url;
}

function forget(name: string) {
  const url = urls.get(name);
  if (url) URL.revokeObjectURL(url);
  urls.delete(name);
  recordings.delete(name);
}

export function discardRecordings(interviewId: string) {
  for (const name of recordings.keys()) if (name.startsWith(`${interviewId}/`)) forget(name);
}
