"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveProfile, type ProfileState } from "./actions";
import PhotoCropper from "@/components/PhotoCropper";
import { preloadFaceDetector } from "@/lib/faceDetect";
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
  const [cropping, setCropping] = useState<File | null>(null);
  const lastCropped = useRef<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const isNew = !initial;

  useEffect(() => {
    preloadFaceDetector();
  }, []);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Pick a photo, not a video or file.");
      e.target.value = "";
      return;
    }
    setCropping(file);
  }

  function onCropped(photo: Blob) {
    const cropped = new File([photo], "photo.jpg", { type: "image/jpeg" });
    const dt = new DataTransfer();
    dt.items.add(cropped);
    if (photoRef.current) photoRef.current.files = dt.files;
    lastCropped.current = cropped;
    setPreview(URL.createObjectURL(cropped));
    setCropping(null);
  }

  function onCropCancel() {
    // Put the input back the way it was before this pick.
    if (photoRef.current) {
      if (lastCropped.current) {
        const dt = new DataTransfer();
        dt.items.add(lastCropped.current);
        photoRef.current.files = dt.files;
      } else {
        photoRef.current.value = "";
      }
    }
    setCropping(null);
  }

  return (
    <form action={action} className="form wrap">
      <div className="field">
        <span className="label" id="photo-label">Profile photo</span>
        <span className="hint">
          Just your face, front and center. No sunglasses or group shots.
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
        {cropping && <PhotoCropper file={cropping} onDone={onCropped} onCancel={onCropCancel} />}
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
        <span className="hint">Nobody sees it.</span>
        <input className="input" name="zip" inputMode="numeric" pattern="\d{5}" maxLength={5} required autoComplete="postal-code" defaultValue={initial?.zip} />
      </label>

      <label className="field">
        <span className="label">Three things you&apos;re into</span>
        <input className="input" name="interests" required maxLength={300} placeholder="Horror movies, pickleball, Drag Race" defaultValue={initial?.interests} />
      </label>

      <fieldset className="field choices">
        <legend className="label">What are you looking for?</legend>
        <span className="hint">Private.</span>
        <label className="choice">
          <input type="radio" name="looking_for" value="friends" required defaultChecked={initial?.looking_for === "friends"} />
          <span>
            Friends
          </span>
        </label>
        <label className="choice">
          <input type="radio" name="looking_for" value="friends_dating" defaultChecked={initial?.looking_for === "friends_dating"} />
          <span>
            Friends, and open to dating
            <small>Only mutual picks are ever shown.</small>
          </span>
        </label>
      </fieldset>

      <label className="field">
        <span className="label">Your most controversial opinion</span>
        <textarea className="textarea" name="hot_take" required maxLength={600} defaultValue={initial?.hot_take} />
      </label>

      {isNew && (
        <label className="choice">
          <input type="checkbox" name="agree" required />
          <span>
            I&apos;m {SEASON.minAge} or older and I agree to the <a href="/guidelines" target="_blank">Community Guidelines</a>.
          </span>
        </label>
      )}

      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}

      <div className="submit-row">
        <button className="btn btn-pink" type="submit" disabled={pending || !!cropping}>
          {pending ? "Saving" : isNew ? "Save and keep going" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
