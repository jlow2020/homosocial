"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import VideoRecorder from "@/components/VideoRecorder";
import { shrinkImage } from "@/lib/image";
import { addComment, createPost, wallClipTicket } from "./actions";

const MAX_SECONDS = 30;

// Write something, add a photo or a short video, post. Used for posts and for comments.
export default function WallComposer({ postId, placeholder }: { postId?: string; placeholder: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<{ path: string; url: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const comment = !!postId;

  const clear = () => {
    setBody("");
    setPhoto(null);
    setVideo(null);
    setPreview(null);
  };

  const pickPhoto = async (f: File) => {
    setError("");
    setVideo(null);
    try {
      const small = await shrinkImage(f);
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
    } catch {
      setError("That photo didn't work. Try a different one.");
    }
  };

  const pickVideo = async (f: File | Blob) => {
    setError("");
    setPhoto(null);
    setPreview(null);
    const type = f.type === "video/quicktime" || f.type === "video/webm" ? f.type : "video/mp4";
    setBusy("Uploading video...");
    try {
      const t = await wallClipTicket(type, f.size);
      if (!t.ok || !t.signedUrl || !t.path) {
        setError(t.error ?? "That didn't upload.");
        return;
      }
      const up = await fetch(t.signedUrl, { method: "PUT", headers: { "content-type": type, "x-upsert": "false", ...(t.apikey ? { apikey: t.apikey } : {}) }, body: f });
      if (!up.ok) {
        setError("The video didn't upload. Try a shorter clip.");
        return;
      }
      setVideo({ path: t.path, url: URL.createObjectURL(f) });
    } finally {
      setBusy("");
    }
  };

  const send = () => {
    setError("");
    const form = new FormData();
    form.set("body", body);
    if (postId) form.set("post_id", postId);
    if (photo) form.set("photo", photo);
    if (video) form.set("video_path", video.path);
    start(async () => {
      const r = postId ? await addComment(form) : await createPost(form);
      if (!r.ok) setError(r.error ?? "That didn't post.");
      else {
        clear();
        router.refresh();
      }
    });
  };

  if (recording) {
    return (
      <VideoRecorder
        seconds={MAX_SECONDS}
        onCancel={() => setRecording(false)}
        onDone={(clip) => {
          setRecording(false);
          void pickVideo(clip);
        }}
      />
    );
  }

  const ready = (body.trim() || photo || video) && !busy;
  return (
    <div className={comment ? "wall-compose wall-compose-comment" : "wall-compose"}>
      <textarea
        className="input"
        rows={comment ? 1 : 3}
        maxLength={comment ? 800 : 2000}
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="wall-attach" />
      )}
      {video && <video src={video.url} controls playsInline className="wall-attach" />}
      {busy && <p className="fine">{busy}</p>}
      {error && <p className="error">{error}</p>}
      <div className="wall-compose-row">
        <div className="wall-tools">
          <button type="button" className="link-button" onClick={() => photoInput.current?.click()} disabled={!!busy || pending}>
            📷 Photo
          </button>
          <button type="button" className="link-button" onClick={() => setRecording(true)} disabled={!!busy || pending}>
            🎥 Record
          </button>
          <button type="button" className="link-button" onClick={() => videoInput.current?.click()} disabled={!!busy || pending}>
            🎞️ Video
          </button>
          {(photo || video) && (
            <button type="button" className="link-button quiet" onClick={() => (setPhoto(null), setVideo(null), setPreview(null))}>
              Remove
            </button>
          )}
        </div>
        <button type="button" className="btn btn-pink btn-small" disabled={!ready || pending} onClick={send}>
          {pending ? "Posting..." : comment ? "Comment" : "Post"}
        </button>
      </div>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void pickPhoto(f);
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        className="visually-hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void pickVideo(f);
        }}
      />
    </div>
  );
}
