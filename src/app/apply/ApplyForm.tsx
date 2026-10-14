"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitApplication, type ApplyState } from "./actions";

// Shrink phone photos before upload so they fit the server limit.
async function shrinkImage(file: File, maxSide = 1200): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.85)
    );
    if (!blob) return file;
    return new File([blob], "selfie.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const initial: ApplyState = { ok: false };

export default function ApplyForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(submitApplication, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const [selfieError, setSelfieError] = useState<string | null>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) router.push("/apply/thanks");
  }, [state.ok, router]);

  async function onSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    setSelfieError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setSelfieError("Pick a photo, not a video or file.");
      e.target.value = "";
      return;
    }
    const small = await shrinkImage(file);
    const dt = new DataTransfer();
    dt.items.add(small);
    if (selfieRef.current) selfieRef.current.files = dt.files;
    setPreview(URL.createObjectURL(small));
  }

  return (
    <form action={action} className="form wrap" noValidate={false}>
      <div className="field-row">
        <label className="field">
          <span className="label">First name</span>
          <input className="input" name="first_name" required maxLength={60} autoComplete="given-name" />
        </label>
        <label className="field">
          <span className="label">Age</span>
          <input className="input" name="age" type="number" inputMode="numeric" min={18} max={99} required />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="label">Email</span>
          <input className="input" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          <span className="label">Zip code</span>
          <input className="input" name="zip" inputMode="numeric" pattern="\d{5}" maxLength={5} required autoComplete="postal-code" />
        </label>
      </div>

      <label className="field">
        <span className="label">Instagram</span>
        <span className="hint">Optional. It helps us confirm you&apos;re a real person.</span>
        <input className="input" name="instagram" placeholder="@yourhandle" maxLength={60} autoCapitalize="none" />
      </label>

      <div className="field">
        <span className="label" id="selfie-label">A recent selfie</span>
        <span className="hint">Only used to confirm it&apos;s you on the video call. Never posted.</span>
        <div className="selfie">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your selfie" className="selfie-preview" />
          ) : (
            <span className="selfie-empty" aria-hidden="true" />
          )}
          <label className="selfie-pick">
            {preview ? "Change photo" : "Choose a photo"}
            <input
              ref={selfieRef}
              name="selfie"
              type="file"
              accept="image/*"
              required
              aria-labelledby="selfie-label"
              onChange={onSelfie}
              className="visually-hidden"
            />
          </label>
        </div>
        {selfieError && <p className="error">{selfieError}</p>}
      </div>

      <label className="field">
        <span className="label">Three things you&apos;re into</span>
        <input className="input" name="interests" required maxLength={300} placeholder="Horror movies, pickleball, Drag Race" />
      </label>

      <fieldset className="field choices">
        <legend className="label">What are you looking for?</legend>
        <label className="choice">
          <input type="radio" name="looking_for" value="friends" required />
          <span>
            Friends
            <small>Last Call only asks who you want to keep as friends.</small>
          </span>
        </label>
        <label className="choice">
          <input type="radio" name="looking_for" value="friends_dating" />
          <span>
            Friends, and open to dating
            <small>Last Call also asks who you&apos;d want to date. Only mutual picks are shown.</small>
          </span>
        </label>
      </fieldset>

      <label className="field">
        <span className="label">Your most controversial opinion</span>
        <span className="hint">Food, music, movies, whatever. This is how we get a feel for you.</span>
        <textarea className="textarea" name="hot_take" required maxLength={600} />
      </label>

      <label className="field">
        <span className="label">How did you hear about Homosocial?</span>
        <input className="input" name="heard_from" maxLength={200} />
      </label>

      <div className="honey" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="choice">
        <input type="checkbox" name="agree" required />
        <span>
          I&apos;m 18 or older, I live in the Sarasota area, and I&apos;ll be decent to people.
        </span>
      </label>

      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}

      <div className="submit-row">
        <button className="btn btn-pink" type="submit" disabled={pending}>
          {pending ? "Sending your application" : "Send my application"}
        </button>
      </div>
    </form>
  );
}
