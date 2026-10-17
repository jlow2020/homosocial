"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkId } from "./actions";
import { shrinkImage } from "@/lib/image";

type Kind = "card" | "passport";

const KINDS: { id: Kind; title: string; detail: string }[] = [
  {
    id: "card",
    title: "Driver's license or ID card",
    detail: "Any US state license or ID, passport card, green card, or other card. Two photos: front and back.",
  },
  {
    id: "passport",
    title: "Passport book",
    detail: "Any country. One photo of the page with your picture.",
  },
];

function Shot({
  label,
  hint,
  file,
  onFile,
}: {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <label className="shot">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="shot-img" />
      ) : (
        <span className="shot-empty" aria-hidden="true">+</span>
      )}
      <span className="shot-label">{file ? `Retake ${label.toLowerCase()}` : label}</span>
      <span className="hint">{hint}</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const small = await shrinkImage(f, 2200, 0.92).catch(() => f);
          setPreview(URL.createObjectURL(small));
          onFile(small);
        }}
      />
    </label>
  );
}

export default function IdCheck() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);

  const ready = kind === "passport" ? !!front : !!front && !!back;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("kind", kind!);
    form.append("front", front!);
    if (kind === "card" && back) form.append("back", back);
    try {
      const outcome = await checkId(form);
      if (outcome.passed) {
        router.push("/circle");
        router.refresh();
        return;
      }
      setError({ message: outcome.message, retry: outcome.retry });
    } catch {
      setError({ message: "Something went wrong. Reload the page and try again.", retry: true });
    }
    setBusy(false);
  }

  if (!kind) {
    return (
      <div className="form wrap">
        <div className="stack">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className="choice choice-button" onClick={() => setKind(k.id)}>
              <span>
                {k.title}
                <small>{k.detail}</small>
              </span>
            </button>
          ))}
          <p className="fine">
            Military ID? Federal law doesn&apos;t allow photos of military IDs, so use your driver&apos;s
            license or passport instead.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="form wrap">
      <div className="stack">
        <div className="shots">
          <Shot
            label={kind === "passport" ? "Photo page" : "Front"}
            hint={kind === "passport" ? "Whole page, including the <<< lines at the bottom." : "The side with your picture."}
            file={front}
            onFile={setFront}
          />
          {kind === "card" && (
            <Shot label="Back" hint="The side with the barcode or the <<< lines." file={back} onFile={setBack} />
          )}
        </div>
        <ul className="facts">
          <li>Lay it flat on a dark surface, in good light.</li>
          <li>Fill the frame. No fingers over the picture or the barcode.</li>
          <li>Tilt it a little if there&apos;s glare.</li>
        </ul>
        {error && <p className="error" role="alert">{error.message}</p>}
        {(!error || error.retry) && (
          <button className="btn btn-pink btn-full" type="button" disabled={!ready || busy} onClick={submit}>
            {busy ? "Checking your ID. Hang tight." : "Check my ID"}
          </button>
        )}
        <button
          type="button"
          className="link-button quiet"
          disabled={busy}
          onClick={() => {
            setKind(null);
            setFront(null);
            setBack(null);
            setError(null);
          }}
        >
          Use a different ID
        </button>
      </div>
    </div>
  );
}
