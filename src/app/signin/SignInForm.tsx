"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { sendReset, signInWithUsername, type SignInState } from "./actions";

export default function SignInForm() {
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [state, signIn, signingIn] = useActionState<SignInState, FormData>(signInWithUsername, {});
  const [resetState, reset, resetting] = useActionState<SignInState, FormData>(sendReset, {});

  if (mode === "reset") {
    if (resetState.resetSent) {
      return (
        <div className="form wrap">
          <div className="notice">
            <h2 className="notice-title">Check your email.</h2>
            <p>
              If <strong>{resetState.resetSent}</strong> has an account, a reset link is on its way. It
              works once and lasts an hour. Your username is on the page it opens.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="form wrap">
        <form action={reset} className="stack">
          <label className="field">
            <span className="label">Email</span>
            <span className="hint">The one you signed up with. We&apos;ll send a link to reset your password.</span>
            <input className="input" name="email" type="email" required autoComplete="email" />
          </label>
          {resetState.error && <p className="error" role="alert">{resetState.error}</p>}
          <button className="btn btn-pink btn-full" type="submit" disabled={resetting}>
            {resetting ? "Sending" : "Email me a reset link"}
          </button>
          <button type="button" className="link-button quiet" onClick={() => setMode("signin")}>
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="form wrap">
      <form action={signIn} className="stack">
        <label className="field">
          <span className="label">Username</span>
          <input
            className="input"
            name="username"
            required
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <input className="input" name="password" type="password" required autoComplete="current-password" />
        </label>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <button className="btn btn-pink btn-full" type="submit" disabled={signingIn}>
          {signingIn ? "Signing in" : "Sign in"}
        </button>
        <button type="button" className="link-button quiet" onClick={() => setMode("reset")}>
          Forgot your username or password?
        </button>
      </form>
      <p className="fine">
        New here? <Link href="/join">Grab a seat</Link>.
      </p>
    </div>
  );
}
