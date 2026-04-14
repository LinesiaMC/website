export const LINESIA_IP = "play.linesia.net";
export const LINESIA_PORT = 19132;

export type PlayResult = "launched" | "copied" | "error";

export function launchMinecraft(locale: string = "fr"): Promise<PlayResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve("error");

    const uri = `minecraft://?addExternalServer=Linesia|${LINESIA_IP}:${LINESIA_PORT}`;
    let settled = false;

    const copyFallback = async () => {
      if (settled) return;
      settled = true;
      try {
        await navigator.clipboard.writeText(LINESIA_IP);
        resolve("copied");
      } catch {
        resolve("error");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        settled = true;
        document.removeEventListener("visibilitychange", onVisibility);
        resolve("launched");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    try {
      window.location.href = uri;
    } catch {
      void copyFallback();
      return;
    }

    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (!settled) void copyFallback();
    }, 1500);

    void locale;
  });
}
