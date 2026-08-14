/**
 * The one film, as a link.
 *
 * Marianne uploads the film to Vimeo or YouTube and pastes the address here.
 * Nothing is uploaded to this site and nothing is transcoded by it: her own
 * source file is 604 MB, and a site that accepted that would need an encoding
 * queue, somewhere to keep the output and a way to tell her it had finished —
 * three things to go wrong in place of a provider that already does it.
 *
 * What is STORED is the address she pasted, in its canonical form. The player
 * address is derived from it at render, here, so the field on the form shows
 * her back what she typed and a change of embed shape never needs a migration.
 */

export type FilmProvider = "vimeo" | "youtube";

export type Film = {
  provider: FilmProvider;
  /** The provider's own identifier for it. */
  id: string;
  /** As stored: the page a person would open to watch it. */
  watchUrl: string;
  /** The player, with the provider's own do-not-track flag set. */
  embedUrl: string;
  /** For saying, on the page, whom the visitor is about to contact. */
  providerName: string;
};

/**
 * Vimeo's unlisted films carry a hash in the address. Without it the player
 * refuses, so it is carried through — it is not a secret from anyone who was
 * given the link, which is the entire idea of an unlisted film.
 */
const VIMEO =
  /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d+)(?:\/([0-9a-z]+))?/i;
const VIMEO_PLAYER =
  /^(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)(?:\?.*\bh=([0-9a-z]+))?/i;

const YOUTUBE_SHORT = /^(?:https?:\/\/)?youtu\.be\/([\w-]{11})/i;
const YOUTUBE_LONG =
  /^(?:https?:\/\/)?(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=([\w-]{11})|embed\/([\w-]{11})|shorts\/([\w-]{11})|live\/([\w-]{11}))/i;

/**
 * What she pasted, understood — or null, which the form turns into a sentence.
 *
 * Every ordinary form of both addresses is accepted, because the one she has
 * is whichever one the site she was on put on her clipboard: the share panel,
 * the address bar, and the embed code all give different strings for the same
 * film.
 */
export function parseFilm(raw: string): Film | null {
  const input = raw.trim();
  if (!input) return null;

  const vimeo = VIMEO.exec(input) ?? VIMEO_PLAYER.exec(input);
  if (vimeo) {
    const [, id, hash] = vimeo;
    return {
      provider: "vimeo",
      id,
      providerName: "Vimeo",
      watchUrl: `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`,
      // dnt=1 is Vimeo's own do-not-track flag: no cookies, no analytics, no
      // third-party session. It only matters once somebody presses play, and
      // that is exactly when it matters.
      embedUrl: `https://player.vimeo.com/video/${id}?${hash ? `h=${hash}&` : ""}dnt=1&title=0&byline=0&portrait=0`,
    };
  }

  const youtube = YOUTUBE_SHORT.exec(input) ?? YOUTUBE_LONG.exec(input);
  if (youtube) {
    const id = youtube.slice(1).find(Boolean) as string;
    return {
      provider: "youtube",
      id,
      providerName: "YouTube",
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      // youtube-nocookie is the least YouTube offers. It is still YouTube,
      // which is why the page does not load it until somebody asks — see
      // components/site/FilmEmbed.tsx.
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    };
  }

  return null;
}

/** Seconds, as a film's length is written. */
function asDuration(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = String(whole % 60).padStart(2, "0");
  if (minutes < 60) return `${minutes}:${rest}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${rest}`;
}

export type FilmDetails = {
  /** Where the provider keeps the still it opens on. Fetched, never linked to. */
  posterUrl: string | null;
  /** "0:42", when the provider says. YouTube's oEmbed does not. */
  duration: string | null;
};

/**
 * What the provider will tell us about a film.
 *
 * oEmbed, which both of them publish and neither requires a key for. It is
 * asked once, when the link is saved, and never again on a page render.
 *
 * It is NEVER allowed to stop a save. A private film, a provider having a bad
 * morning, or no outbound network at all all produce nulls: the film still
 * saves, and the page shows a plain plate to press
 * instead of a still. The film is what she asked for; the still is a courtesy
 * on top of it.
 */
export async function describeFilm(film: Film): Promise<FilmDetails> {
  const endpoint =
    film.provider === "vimeo"
      ? `https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(film.watchUrl)}`
      : `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(film.watchUrl)}`;

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return { posterUrl: null, duration: null };

    const body = (await response.json()) as {
      thumbnail_url?: string;
      duration?: number;
    };
    return {
      posterUrl:
        typeof body.thumbnail_url === "string" &&
        body.thumbnail_url.startsWith("https://")
          ? body.thumbnail_url
          : null,
      duration:
        typeof body.duration === "number" ? asDuration(body.duration) : null,
    };
  } catch {
    return { posterUrl: null, duration: null };
  }
}

/**
 * The basename a film's still is kept under.
 *
 * One per film, and REPLACED when the film changes rather than accumulating
 * numbered copies — the still belongs to the film, not to her library.
 *
 * The double hyphen is what keeps it out of the picture picker. `slugify`
 * collapses every run of punctuation to a single hyphen, so no file she
 * uploads can ever produce a name beginning `film--`; `listMediaBasenames`
 * uses that to leave these out of the list she chooses from.
 */
export const POSTER_PREFIX = "film--";

export function posterBasename(film: Film): string {
  // A YouTube identifier carries underscores and capitals, neither of which a
  // served file name may hold. Flattening them cannot collide in practice —
  // there is one film per workshop, not eleven characters' worth.
  const id = film.id.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${POSTER_PREFIX}${film.provider}-${id}`;
}
