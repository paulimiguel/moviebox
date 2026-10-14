import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type YouTubePlayer = { destroy: () => void };
type YouTubeApi = {
  Player: new (element: HTMLElement, options: {
    host?: string;
    videoId: string;
    playerVars: Record<string, number | string>;
    events: { onError: () => void };
  }) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API no disponible"));
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existingScript) {
      existingScript.addEventListener("error", () => reject(new Error("No se pudo cargar YouTube")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.addEventListener("error", () => {
      youtubeApiPromise = null;
      reject(new Error("No se pudo cargar YouTube"));
    }, { once: true });
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
};

const getYouTubeVideoId = (url: string) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");

      const [format, videoId] = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(format)) return videoId || null;
    }
  } catch {
    return null;
  }

  return null;
};

export const TrailerModal = ({
  title,
  trailerUrl,
  onClose,
}: {
  title: string;
  trailerUrl: string;
  onClose: () => void;
}) => {
  const videoId = getYouTubeVideoId(trailerUrl);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(!videoId);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!videoId || !playerContainerRef.current) {
      setUnavailable(true);
      return;
    }

    let cancelled = false;
    let player: YouTubePlayer | null = null;
    setUnavailable(false);

    void loadYouTubeApi()
      .then((youtube) => {
        if (cancelled || !playerContainerRef.current) return;
        player = new youtube.Player(playerContainerRef.current, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          playerVars: { autoplay: 1, rel: 0, origin: window.location.origin },
          events: {
            onError: () => {
              if (!cancelled) setUnavailable(true);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, [videoId]);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trailer-modal-title"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-md bg-black shadow-2xl">
        <header className="flex min-h-14 items-center gap-3 border-b border-white/15 bg-[#111] px-4 py-2 sm:px-5">
          <h2
            id="trailer-modal-title"
            className="min-w-0 flex-1 truncate text-left text-base font-semibold text-white"
          >
            Trailer · {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white transition-colors hover:bg-white/15"
            title="Cerrar trailer"
            aria-label="Cerrar trailer"
            autoFocus
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="aspect-video w-full bg-black">
          {unavailable
            ? <div className="h-full w-full" />
            : <div ref={playerContainerRef} className="h-full w-full" title={`Trailer de ${title}`} />}
        </div>
      </div>
    </div>,
    document.body,
  );
};
