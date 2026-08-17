"use client";

import { useState } from "react";
import {
  listLibraryVideos,
  type PickableVideo,
} from "@/app/(admin)/admin/media/actions";
import GalleryPicker from "@/components/admin/GalleryPicker";
import { FIELD, QUIET_BUTTON } from "@/components/admin/OfferingFormParts";

/**
 * The link to the film, with the library beside it.
 *
 * ONE FIELD, TWO WAYS TO FILL IT: paste an address, or pick a film she has
 * already used. The field itself is unchanged — same name, same value, same
 * server-side parse — so a form posted from either route is the same form. The
 * offering forms' own validation and error message are untouched.
 *
 * CONTROLLED, WHERE THE PLAIN INPUT WAS NOT. Picking from the library has to be
 * able to put a value into the field, and an uncontrolled input cannot be
 * written to from outside without reaching for a ref. The initial value is the
 * one the form was rendering before, including whatever a bounced save echoed
 * back, so nothing she typed is lost by this change.
 *
 * THE LIST IS FETCHED WHEN THE PICKER OPENS, not when the form renders — see
 * `listLibraryVideos` for why the alternative was six pages' worth of plumbing.
 */
export default function FilmField({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [films, setFilms] = useState<PickableVideo[] | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [failed, setFailed] = useState(false);

  async function open() {
    setFailed(false);
    setBrowsing(true);
    // Re-read every time. She may have pasted a film into the library in
    // another tab, and a list cached from the first open would not show it.
    try {
      setFilms(await listLibraryVideos());
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <input
          name={name}
          type="text"
          inputMode="url"
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={`${FIELD} min-w-[18rem] flex-1`}
        />
        {/* `type="button"` — this sits inside the offering form, and a bare
            button in a form submits it. */}
        <button
          type="button"
          onClick={() => void open()}
          className={QUIET_BUTTON}
        >
          Pick from your films
        </button>
      </div>

      {failed && (
        <p role="alert" className="mt-2 text-[15px] text-pool-error">
          Your films could not be fetched just now. Pasting the address still
          works.
        </p>
      )}

      <GalleryPicker
        kind="video"
        assets={(films ?? []).map((film) => ({
          kind: "video" as const,
          ref: film.ref,
          title: film.title,
          alt: null,
          contentType: null,
          bytes: null,
        }))}
        open={browsing}
        chosen={value ? [value] : []}
        onClose={() => setBrowsing(false)}
        onPick={(refs) => {
          if (refs[0]) setValue(refs[0]);
        }}
        // A film pasted from inside the picker is chosen by the picker itself;
        // this keeps the open list in step so it appears in the grid behind.
        onAdded={(ref) =>
          setFilms((current) =>
            current && !current.some((film) => film.ref === ref)
              ? [{ ref, title: null }, ...current]
              : current,
          )
        }
      />
    </>
  );
}
