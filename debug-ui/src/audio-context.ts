export const isSupported = () =>
  typeof window !== "undefined" &&
  ("AudioContext" in window || "webkitAudioContext" in window);
