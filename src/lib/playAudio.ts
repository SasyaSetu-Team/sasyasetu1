export function playAudioBlob(blob: Blob, onEnded?: () => void): void {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => {
    URL.revokeObjectURL(url);
    onEnded?.();
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    onEnded?.();
  };
  audio.play().catch(() => {
    URL.revokeObjectURL(url);
    onEnded?.();
  });
}
