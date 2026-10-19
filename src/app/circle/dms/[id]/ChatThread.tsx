"use client";

import SpeedGame, { type Game } from "./SpeedGame";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { clipTicket, reactDm, sendDm, sendDmClip, sendDmPhoto } from "../../game-actions";
import { shrinkImage } from "@/lib/image";
import { reportMember } from "../../actions";

export type ChatMessage = {
  id: string;
  mine: boolean;
  body: string | null;
  media: { type: "photo" | "video"; url: string | null; converting?: boolean } | null;
  at: string;
  held?: boolean;
  game?: Game | null;
  reactions: { emoji: string; mine: boolean }[];
};

const TAPBACKS = ["❤️", "😂", "🔥", "😮", "😢", "👑"];
const EMOJI = [
  "😂", "🤣", "😍", "🥰", "😘", "😏", "😈", "🥵", "🫦", "👀", "🔥", "💦", "🍑", "🍆", "👅", "💋",
  "❤️", "🩷", "💜", "🖤", "🏳️‍🌈", "🌈", "👑", "💅", "🙌", "👏", "🙏", "💀", "😭", "😮", "🤭", "🫣",
  "🥂", "🍸", "🏖️", "🌴", "🎉", "✨", "💯", "🤝", "☕", "🎶", "🐻", "🦦", "🌹", "🙈", "😴", "🤤",
];
const MAX_CLIP_SECONDS = 30;

const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return dayFmt.format(d);
}

type Pending = { id: string; body: string | null; label?: string };

export default function ChatThread({
  threadId,
  otherId,
  messages,
  otherName,
  otherPhoto,
  seenAt,
  media,
  canSend,
  waiting,
  footer,
}: {
  threadId: string;
  otherId: string;
  messages: ChatMessage[];
  otherName: string;
  otherPhoto: string | null;
  seenAt: string | null;
  media: boolean;
  canSend: boolean;
  waiting: boolean;
  footer: React.ReactNode;
}) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [open, setOpen] = useState<string | null>(null); // message with the reaction bar open
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length;

  // New messages arrived from the server: drop the stand-ins and scroll down.
  useEffect(() => {
    setPending([]);
    end.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const lastMine = useMemo(() => [...messages].reverse().find((m) => m.mine), [messages]);
  const seen = !!(lastMine && seenAt && new Date(seenAt) >= new Date(lastMine.at));

  return (
    <div className="dm-thread">
      <ul className="dm-list" onClick={() => setOpen(null)}>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay = !prev || dayLabel(prev.at) !== dayLabel(m.at);
          const gap = prev && new Date(m.at).getTime() - new Date(prev.at).getTime() > 20 * 60 * 1000;
          const firstOfGroup = newDay || gap || !prev || prev.mine !== m.mine;
          const lastOfGroup = !next || next.mine !== m.mine || dayLabel(next.at) !== dayLabel(m.at);
          return (
            <li key={m.id} className="dm-row-wrap">
              {newDay && <div className="dm-day">{dayLabel(m.at)}</div>}
              {!newDay && gap && <div className="dm-day">{timeFmt.format(new Date(m.at))}</div>}
              <Bubble
                m={m}
                first={firstOfGroup}
                last={lastOfGroup}
                otherPhoto={otherPhoto}
                otherName={otherName}
                otherId={otherId}
                open={open === m.id}
                setOpen={(v) => setOpen(v ? m.id : null)}
              />
              {lastMine?.id === m.id && seen && <div className="dm-seen">Seen</div>}
            </li>
          );
        })}
        {pending.map((p) => (
          <li key={p.id} className="dm-row-wrap">
            <div className="dm-row mine">
              <div className="dm-bubble-col">
                <p className="dm-bubble mine sending">{p.body ?? p.label}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {messages.length === 0 && pending.length === 0 && (
        <p className="dm-empty">{waiting ? "Say hi. You get one message until he says yes." : `Say something to ${otherName}.`}</p>
      )}
      <div ref={end} />
      <div className="dm-footer">
        {footer}
        {canSend && (
          <DmComposer
            threadId={threadId}
            media={media}
            otherName={otherName}
            onPending={(p) => setPending((cur) => [...cur, p])}
            onFailed={(id) => setPending((cur) => cur.filter((x) => x.id !== id))}
          />
        )}
        {!canSend && waiting && <p className="fine">Sent. You can keep talking once he says yes.</p>}
      </div>
    </div>
  );
}

function Bubble({
  m,
  first,
  last,
  otherPhoto,
  otherName,
  otherId,
  open,
  setOpen,
}: {
  m: ChatMessage;
  otherId: string;
  first: boolean;
  last: boolean;
  otherPhoto: string | null;
  otherName: string;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [, start] = useTransition();
  const [reactions, react] = useOptimistic(m.reactions, (cur, emoji: string) => {
    const mine = cur.find((r) => r.mine);
    const rest = cur.filter((r) => !r.mine);
    return mine?.emoji === emoji ? rest : [...rest, { emoji, mine: true }];
  });
  const lastTap = useRef(0);
  const choose = (emoji: string) =>
    start(async () => {
      react(emoji);
      setOpen(false);
      await reactDm(m.id, emoji);
    });

  const onTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap: heart it.
      lastTap.current = 0;
      if (!reactions.some((r) => r.mine && r.emoji === "❤️")) choose("❤️");
      return;
    }
    lastTap.current = now;
    setOpen(!open);
  };

  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  const shape = `${first ? "first " : ""}${last ? "last" : ""}`;

  return (
    <div className={`dm-row ${m.mine ? "mine" : "theirs"} ${last ? "end" : ""}`}>
      {!m.mine &&
        (last ? (
          otherPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherPhoto} alt="" className="dm-face" />
          ) : (
            <span className="dm-face" />
          )
        ) : (
          <span className="dm-face-space" />
        ))}
      <div className="dm-bubble-col">
        {open && (
          <div className="tapbacks" role="menu" onClick={(e) => e.stopPropagation()}>
            {TAPBACKS.map((t) => (
              <button
                key={t}
                className={reactions.some((r) => r.mine && r.emoji === t) ? "tapback on" : "tapback"}
                onClick={() => choose(t)}
                aria-label={`React ${t}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {m.media && <Media media={m.media} mine={m.mine} name={otherName} otherId={otherId} messageId={m.id} onTap={onTap} />}
        {m.game ? (
          <SpeedGame game={m.game} otherName={otherName} />
        ) : (
          m.body && (
            <p className={`dm-bubble ${m.mine ? "mine" : "theirs"} ${shape}`} onClick={onTap}>
              {m.body}
            </p>
          )
        )}
        {m.held && <span className="held-tag">⏳ Held for a quick look. He won&apos;t see it unless it&apos;s cleared.</span>}
        {counts.size > 0 && (
          <button className="dm-reacts" onClick={onTap} aria-label="Reactions">
            {[...counts.entries()].map(([e, n]) => (
              <span key={e}>
                {e}
                {n > 1 && <b>{n}</b>}
              </span>
            ))}
          </button>
        )}
        {last && <span className="dm-time">{timeFmt.format(new Date(m.at))}</span>}
      </div>
    </div>
  );
}

// Photos and clips from him start blurred. Tap to see.
function Media({
  media,
  mine,
  name,
  otherId,
  messageId,
  onTap,
}: {
  media: { type: "photo" | "video"; url: string | null; converting?: boolean };
  mine: boolean;
  name: string;
  otherId: string;
  messageId: string;
  onTap: (e: React.MouseEvent) => void;
}) {
  const [shown, setShown] = useState(mine);
  const [reported, setReported] = useState(false);
  const report = !mine && (
    <button
      className="dm-report"
      disabled={reported}
      onClick={async (e) => {
        e.stopPropagation();
        const r = await reportMember(otherId, "other", `Unwanted DM ${media.type} (${messageId})`);
        if (r.ok) setReported(true);
      }}
    >
      {reported ? "Reported. He's blocked." : "Report"}
    </button>
  );
  if (media.converting) return <p className="dm-bubble theirs">⏳ Clip converting, a minute tops</p>;
  if (!media.url) return <p className="dm-bubble theirs">Media unavailable</p>;
  if (!shown) {
    return (
      <button className="dm-media veiled" onClick={(e) => (e.stopPropagation(), setShown(true))} aria-label="Tap to see">
        {media.type === "video" ? (
          <video src={`${media.url}#t=0.1`} muted playsInline preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt="" />
        )}
        <span className="veil-label">
          {media.type === "video" ? "▶ Video" : "📷 Photo"} from {name}
          <small>Tap to see</small>
        </span>
      </button>
    );
  }
  return (
    <>
      {media.type === "video" ? (
        <div className="dm-media" onDoubleClick={onTap}>
          <video src={media.url} controls playsInline preload="metadata" />
        </div>
      ) : (
        <div className="dm-media" onClick={onTap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.url} alt="" />
        </div>
      )}
      {report}
    </>
  );
}

function DmComposer({
  threadId,
  media,
  otherName,
  onPending,
  onFailed,
}: {
  threadId: string;
  media: boolean;
  otherName: string;
  onPending: (p: Pending) => void;
  onFailed: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [, start] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);

  // Grow with the message, up to a point.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    const id = `p${Date.now()}`;
    setText("");
    setError("");
    onPending({ id, body });
    start(async () => {
      const r = await sendDm(threadId, body);
      if (!r.ok) {
        onFailed(id);
        setText(body);
        setError(r.error ?? "That didn't send.");
      }
    });
  };

  const sendFile = async (f: File) => {
    setError("");
    if (f.type.startsWith("image/")) {
      const id = `p${Date.now()}`;
      onPending({ id, body: null, label: "📷 Sending photo..." });
      setBusy("Sending photo...");
      try {
        const small = await shrinkImage(f, 1600, 0.85);
        const form = new FormData();
        form.set("thread", threadId);
        form.set("photo", small);
        const r = await sendDmPhoto(form);
        if (!r.ok) {
          onFailed(id);
          setError(r.error ?? "That didn't send.");
        }
      } finally {
        setBusy("");
      }
      return;
    }
    if (f.type.startsWith("video/")) {
      const seconds = await videoLength(f);
      if (seconds > MAX_CLIP_SECONDS + 0.5) {
        setError(`Clips can be up to ${MAX_CLIP_SECONDS} seconds. That one's ${Math.round(seconds)}. Trim it in Photos first.`);
        return;
      }
      const type = f.type === "video/quicktime" || f.type === "video/webm" ? f.type : "video/mp4";
      const id = `p${Date.now()}`;
      onPending({ id, body: null, label: "▶ Sending video..." });
      setBusy("Uploading video...");
      try {
        const ticket = await clipTicket(threadId, type, f.size);
        if (!ticket.ok || !ticket.signedUrl || !ticket.path) {
          onFailed(id);
          setError(ticket.error ?? "That didn't send.");
          return;
        }
        const up = await fetch(ticket.signedUrl, {
          method: "PUT",
          headers: { "content-type": type, "x-upsert": "false", ...(ticket.apikey ? { apikey: ticket.apikey } : {}) },
          body: f,
        });
        if (!up.ok) {
          onFailed(id);
          setError("The video didn't upload. Try a shorter clip.");
          return;
        }
        const r = await sendDmClip(threadId, ticket.path);
        if (!r.ok) {
          onFailed(id);
          setError(r.error ?? "That didn't send.");
        }
      } finally {
        setBusy("");
      }
      return;
    }
    setError("Send a photo or a video.");
  };

  return (
    <div className="dm-composer-wrap">
      {emojiOpen && (
        <div className="emoji-panel" role="listbox" aria-label="Emoji">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              className="emoji-btn"
              onClick={() => {
                setText((t) => t + e);
                box.current?.focus();
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <form
        className="dm-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <button
          type="button"
          className="dm-icon"
          disabled={!media || !!busy}
          onClick={() => file.current?.click()}
          title={media ? "Photo or video" : `Turn on photos above. ${otherName} has to too.`}
          aria-label="Send a photo or video"
        >
          ＋
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*,video/*"
          className="visually-hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void sendFile(f);
          }}
        />
        <button
          type="button"
          className={emojiOpen ? "dm-icon on" : "dm-icon"}
          onClick={() => setEmojiOpen(!emojiOpen)}
          aria-label="Emoji"
          aria-pressed={emojiOpen}
        >
          ☺
        </button>
        <label className="visually-hidden" htmlFor="dm-text">
          Message
        </label>
        <textarea
          id="dm-text"
          ref={box}
          rows={1}
          className="dm-input"
          value={text}
          maxLength={2000}
          placeholder={busy || `Message ${otherName}`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        {text.trim() ? (
          <button className="dm-send" aria-label="Send">
            ➤
          </button>
        ) : (
          <button
            type="button"
            className="dm-send heart"
            aria-label="Send a heart"
            onClick={() => {
              const id = `p${Date.now()}`;
              onPending({ id, body: "❤️" });
              start(async () => {
                const r = await sendDm(threadId, "❤️");
                if (!r.ok) {
                  onFailed(id);
                  setError(r.error ?? "That didn't send.");
                }
              });
            }}
          >
            ❤️
          </button>
        )}
      </form>
    </div>
  );
}

function videoLength(f: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(f);
  });
}
