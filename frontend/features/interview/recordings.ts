/** 질문별 녹화. 저장 API가 정해지기 전까지 이 탭의 메모리에만 둔다 */
const recordings = new Map<string, Blob>();
const key = (interviewId: string, questionId: string) => `${interviewId}/${questionId}`;

export function saveRecording(interviewId: string, questionId: string, recording: Blob) {
  recordings.set(key(interviewId, questionId), recording);
}

export function getRecording(interviewId: string, questionId: string) {
  return recordings.get(key(interviewId, questionId));
}

export function discardRecordings(interviewId: string) {
  for (const name of recordings.keys()) if (name.startsWith(`${interviewId}/`)) recordings.delete(name);
}
