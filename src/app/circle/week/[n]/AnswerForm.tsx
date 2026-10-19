"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerDrop } from "../../game-actions";
import { shrinkImage } from "@/lib/image";

export default function AnswerForm({ week, kind, canPass }: { week: number; kind: "text" | "photo"; canPass: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmPass, setConfirmPass] = useState(false);
  const photo = useRef<File | null>(null);
  const text = useRef<HTMLTextAreaElement>(null);

  const submit = (pass: boolean) =>
    start(async () => {
      setError("");
      const form = new FormData();
      form.set("week", String(week));
      if (pass) form.set("pass", "1");
      else {
        form.set("body", text.current?.value ?? "");
        if (photo.current) form.set("photo", photo.current);
      }
      const r = await answerDrop(form);
      if (!r.ok) setError(r.error ?? "That didn't work.");
      else router.refresh();
    });

  return (
    <div className="answer-form">
      {kind === "photo" && (
        <label className="photo-pick">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your photo" />
          ) : (
            <span>Tap to add your photo</span>
          )}
          <input
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const small = await shrinkImage(f, 1600, 0.85);
              photo.current = small;
              setPreview(URL.createObjectURL(small));
            }}
          />
        </label>
      )}
      <label className="visually-hidden" htmlFor="answer">
        Your answer
      </label>
      <textarea
        id="answer"
        ref={text}
        className="textarea"
        rows={kind === "photo" ? 2 : 4}
        maxLength={1200}
        placeholder={kind === "photo" ? "Add a caption (optional)" : "Be specific. Be messy. Be you."}
      />
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn-pink" disabled={pending} onClick={() => submit(false)}>
          {pending ? "Posting..." : "Post and unlock"}
        </button>
        {canPass &&
          (confirmPass ? (
            <>
              <button className="link-button" disabled={pending} onClick={() => submit(true)}>
                Yes, use my Pass
              </button>
              <button className="link-button quiet" onClick={() => setConfirmPass(false)}>
                Never mind
              </button>
            </>
          ) : (
            <button className="link-button quiet" onClick={() => setConfirmPass(true)}>
              Pass on this one
            </button>
          ))}
      </div>
      {canPass && confirmPass && <p className="fine">One Pass a Season.</p>}
    </div>
  );
}
