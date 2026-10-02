import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
          {videoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`}
              title={`Trailer de ${title}`}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-white/70">
              No se pudo reproducir este enlace de YouTube.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
