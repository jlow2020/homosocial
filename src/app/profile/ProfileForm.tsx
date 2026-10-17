"use client";

import { useActionState, useRef, useState } from "react";
import { saveProfile, type ProfileState } from "./actions";
import { shrinkImage } from "@/lib/image";
import { SEASON } from "@/lib/season";

type Initial = {
  first_name: string;
  birthdate: string;
  zip: string;
  interests: string;
  looking_for: string;
  hot_take: string;
} | null;

export default function ProfileForm({ initial, photoUrl }: { initial: Initial; photoUrl: string | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const isNew = !initial;

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Pick a photo, not a video or file.");
      e.target.value = "";
      return;
    }
    try {
      const small = await shrinkImage(file);
      const dt = new DataTransfer();
      dt.items.add(small);
      if (photoRef.current) photoRef.current.files = dt.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      setPhotoError("That photo didn't load. Try a different one.");
      e.target.value = "";
    }
  }

  return (
    <form action={action} className="form wrap">
      <div className="field">
        <span className="label" id="photo-label">Profile photo</span>
        <span className="hint">
          Just you, face clearly visible. Your Realness Check matches against this photo.
        </span>
        <div className="selfie">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your profile photo" className="selfie-preview" />
          ) : (
            <span className="selfie-empty" aria-hidden="true" />
          )}
          <label className="selfie-pick">
            {preview ? "Change photo" : "Choose a photo"}
            <input
              ref={photoRef}
              name="photo"
              type="file"
              accept="image/*"
              required={isNew}
              aria-labelledby="photo-label"
              onChange={onPhoto}
              className="visually-hidden"
            />
          </label>
        </div>
        {photoError && <p className="error">{photoError}</p>}
        {!isNew && (
          <span className="hint">Changing your photo means doing a new Realness Check.</span>
        )}
      </div>

      <div className="field-row">
        <label className="field">
          <span className="label">First name</span>
          <input className="input" name="first_name" required maxLength={60} autoComplete="given-name" defaultValue={initial?.first_name} />
        </label>
        <label className="field">
          <span className="label">Birthday</span>
          <input className="input" name="birthdate" type="date" required autoComplete="bday" defaultValue={initial?.birthdate} />
        </label>
      </div>

      <label className="field">
        <span className="label">Zip code</span>
        <span className="hint">Puts you in a Circle near you. Nobody sees your zip.</span>
        <input className="input" name="zip" inputMode="numeric" pattern="\d{5}" maxLength={5} required autoComplete="postal-code" defaultValue={initial?.zip} />
      </label>

      <label className="field">
        <span className="label">Three things you&apos;re into</span>
        <input className="input" name="interests" required maxLength={300} placeholder="Horror movies, pickleball, Drag Race" defaultValue={initial?.interests} />
      </label>

      <fieldset className="field choices">
        <legend className="label">What are you looking for?</legend>
        <span className="hint">Private. Nobody else ever sees this answer.</span>
        <label className="choice">
          <input type="radio" name="looking_for" value="friends" required defaultChecked={initial?.looking_for === "friends"} />
          <span>
            Friends
            <small>The Finale only asks who you want to keep as friends.</small>
          </span>
        </label>
        <label className="choice">
          <input type="radio" name="looking_for" value="friends_dating" defaultChecked={initial?.looking_for === "friends_dating"} />
          <span>
            Friends, and open to dating
            <small>The Finale also asks who you&apos;d want to date. Only mutual picks are shown.</small>
          </span>
        </label>
      </fieldset>

      <label className="field">
        <span className="label">Your most controversial opinion</span>
        <span className="hint">Food, music, movies, whatever. Your Circle sees this.</span>
        <textarea className="textarea" name="hot_take" required maxLength={600} defaultValue={initial?.hot_take} />
      </label>

      {isNew && (
        <label className="choice">
          <input type="checkbox" name="agree" required />
          <span>
            I&apos;m {SEASON.minAge} or older and I agree to the <a href="/rules" target="_blank">house rules</a>.
          </span>
        </label>
      )}

      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}

      <div className="submit-row">
        <button className="btn btn-pink" type="submit" disabled={pending}>
          {pending ? "Saving" : isNew ? "Save and keep going" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
