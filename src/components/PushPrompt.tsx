"use client";

import { useEffect, useState } from "react";
import { dropPushSub, savePushSub } from "@/app/push-actions";

type State = "hidden" | "ask" | "homescreen" | "on" | "off" | "blocked";

function b64ToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Turns on push notifications. On an iPhone that means the site has to be on
// the home screen first, so it says so.
export default function PushPrompt({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("hidden");
  const [busy, setBusy] = useState(false);
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!key) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (ios && !standalone) {
      setState(compact ? "hidden" : "homescreen");
      return;
    }
    if (!supported) return;
    if (Notification.permission === "denied") {
      setState(compact ? "blocked" : "hidden");
      return;
    }
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("push-dismissed") === "1";
    } catch {}
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setState("on");
        // Keep the server's copy fresh.
        savePushSub(sub.toJSON() as Parameters<typeof savePushSub>[0], navigator.userAgent).catch(() => {});
      } else if (compact) setState("off");
      else if (!dismissed) setState("ask");
    });
  }, [key, compact]);

  async function turnOn() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(compact ? "blocked" : "hidden");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key!) as BufferSource });
      await savePushSub(sub.toJSON() as Parameters<typeof savePushSub>[0], navigator.userAgent);
      setState("on");
    } catch {
      setState(compact ? "off" : "hidden");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await dropPushSub(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem("push-dismissed", "1");
    } catch {}
    setState("hidden");
  }

  if (state === "hidden") return null;

  if (compact) {
    return (
      <div className="push-row">
        <span>
          <b>Push notifications</b>
          <span className="fine"> · {state === "on" ? "On" : state === "blocked" ? "Blocked in your browser settings" : "Off"}</span>
        </span>
        {state === "on" && (
          <button className="link-button quiet" disabled={busy} onClick={turnOff}>
            Turn off
          </button>
        )}
        {state === "off" && (
          <button className="btn btn-small" disabled={busy} onClick={turnOn}>
            Turn on
          </button>
        )}
      </div>
    );
  }

  if (state === "on") return null;

  if (state === "homescreen") {
    return (
      <aside className="push-ask">
        <p>
          <b>We recommend turning on notifications.</b> On iPhone, first tap <span className="kbd">Share</span>, then <span className="kbd">Add to Home Screen</span>.
        </p>
        <button className="link-button quiet" onClick={dismiss}>
          Not now
        </button>
      </aside>
    );
  }

  return (
    <aside className="push-ask">
      <p>
        <b>We recommend turning on notifications.</b>
      </p>
      <div className="row">
        <button className="btn btn-small" disabled={busy} onClick={turnOn}>
          {busy ? "One sec" : "Turn on notifications"}
        </button>
        <button className="link-button quiet" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
