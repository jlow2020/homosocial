"use client";

import { useActionState } from "react";
import { joinWithEmail, joinWithGoogle, type JoinState } from "./actions";

export default function JoinForm({ google }: { google: boolean }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinWithEmail, {});

  if (state.sent) {
    return (
      <div className="form wrap">
        <div className="notice">
          <h2 className="notice-title">Check your email.</h2>
          <p>
            We sent a sign-in link to <strong>{state.sent}</strong>. Open it on
            this phone to keep going. It can take a minute, and sometimes it
            lands in spam.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="form wrap">
      {google && (
        <>
          <form action={joinWithGoogle}>
            <button className="btn btn-outline btn-full" type="submit">
              Continue with Google
            </button>
          </form>
          <p className="or">or use your email</p>
        </>
      )}
      <form action={action} className="stack">
        <label className="field">
          <span className="label">Email</span>
          <input className="input" name="email" type="email" required autoComplete="email" />
        </label>
        {state.error && (
          <p className="error" role="alert">
            {state.error}
          </p>
        )}
        <button className="btn btn-pink btn-full" type="submit" disabled={pending}>
          {pending ? "Sending your link" : "Email me a sign-in link"}
        </button>
      </form>
      <p className="fine">
        By joining you agree to the <a href="/rules">house rules</a>. Homosocial
        is for gay, bi, and queer men 18 and up.
      </p>
    </div>
  );
}
