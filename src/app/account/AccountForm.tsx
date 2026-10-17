"use client";

import { useActionState } from "react";
import { saveAccount, type AccountState } from "./actions";

export default function AccountForm({ username }: { username: string | null }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(saveAccount, {});
  const isNew = !username;

  return (
    <form action={action} className="form wrap">
      <div className="stack">
        {isNew ? (
          <label className="field">
            <span className="label">Username</span>
            <span className="hint">3 to 20 letters, numbers, periods or underscores. This is how you sign in.</span>
            <input
              className="input"
              name="username"
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
        ) : (
          <div className="field">
            <span className="label">Username</span>
            <span className="username-show">@{username}</span>
            {/* Lets password managers save the pair together. */}
            <input type="hidden" name="username" value={username} autoComplete="username" />
          </div>
        )}
        <label className="field">
          <span className="label">{isNew ? "Password" : "New password"}</span>
          <span className="hint">At least 8 characters. Let your phone suggest a strong one.</span>
          <input className="input" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
        </label>
        <label className="field">
          <span className="label">Same password again</span>
          <input className="input" name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
        </label>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        {state.saved && <p className="notice-inline" role="status">Saved. Use your new password next time you sign in.</p>}
        <button className="btn btn-pink btn-full" type="submit" disabled={pending}>
          {pending ? "Saving" : isNew ? "Save and keep going" : "Change password"}
        </button>
      </div>
    </form>
  );
}
