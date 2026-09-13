export function isSpeechAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text) {
  if (!isSpeechAvailable() || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if (isSpeechAvailable()) window.speechSynthesis.cancel();
}
