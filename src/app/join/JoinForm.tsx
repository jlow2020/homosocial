"use client";

import { useActionState } from "react";
import { joinWithEmail, joinWithGoogle, type JoinState } from "./actions";
import { SEASON } from "@/lib/season";

export default function JoinForm({ google }: { google: boolean }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinWithEmail, {});

  if (state.sent) {
    const outlook = /@(outlook|hotmail|live|msn)\./i.test(state.sent);
    return (
      <div className="form wrap">
        <div className="notice">
          <h2 className="notice-title">Check your email.</h2>
          <p>
            We sent a link to <strong>{state.sent}</strong>. Open it on this phone to keep going.
          </p>
          <p>
            Not there in a minute? Check {outlook ? "Junk Email" : "Spam"}, and mark it <b>Not spam</b> so the next one
            lands in your inbox.
          </p>
        </div>
        <form action={action} className="stack">
          <input type="hidden" name="email" value={state.sent} />
          <input type="hidden" name="again" value="1" />
          <button className="btn btn-outline btn-full" type="submit" disabled={pending}>
            {pending ? "Sending" : "Send it again"}
          </button>
        </form>
        {state.resent && !state.error && <p className="notice-inline">Sent again. Give it a minute.</p>}
        {state.error && (
          <p className="error" role="alert">
            {state.error}
          </p>
        )}
        <p className="fine">
          Wrong email? <a href="/join">Start over</a>.
        </p>
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
            {state.hasAccount && (
              <>
                {" "}
                <a href="/signin">Sign in</a>
              </>
            )}
          </p>
        )}
        <button className="btn btn-pink btn-full" type="submit" disabled={pending}>
          {pending ? "Sending your link" : "Email me my signup link"}
        </button>
      </form>
      <p className="fine">
        Already have a seat? <a href="/signin">Sign in</a>.
      </p>
      <p className="fine">
        Homosocial is for gay, bi, trans and queer men {SEASON.minAge} and up. Before you pick a username, you&apos;ll
        agree to our <a href="/terms">Terms</a>, <a href="/privacy">Privacy Policy</a> and{" "}
        <a href="/guidelines">Community Guidelines</a>.
      </p>
    </div>
  );
}
