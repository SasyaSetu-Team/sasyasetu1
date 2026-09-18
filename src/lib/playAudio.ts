let currentAudio: HTMLAudioElement | null = null;

export function playAudioBlob(blob: Blob, onEnded?: () => void): void {
  stopAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    const isCurrent = currentAudio === audio;
    if (isCurrent) currentAudio = null;
    URL.revokeObjectURL(url);
    if (isCurrent) onEnded?.();
  };
  audio.onended = finish;
  audio.onerror = finish;
  audio.play().catch(finish);
}

export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}
