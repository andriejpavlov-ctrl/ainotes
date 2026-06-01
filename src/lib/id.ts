// Генерация UUID с запасным вариантом для старых браузеров
// (crypto.randomUUID есть не везде — например, в старых iOS Safari).
export function genId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // упадём в фолбэк
  }
  // RFC4122-совместимый фолбэк на основе случайных чисел.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
