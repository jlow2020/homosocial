"use client";

import { useState, useTransition } from "react";
import { deleteMember, moveToCircle, redoCheck, resetAttempts, saveNotes, setAdminRole, setStatus } from "../../actions";

type Props = {
  id: string;
  isSelf: boolean;
  hasProfile: boolean;
  status: string | null;
  circleId: string | null;
  circles: { id: string; label: string }[];
  notes: string;
  viewerIsGod: boolean;
  targetRole: "god" | "mod" | null;
  confirmName: string | null;
};

export default function AdminActions(p: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmBan, setConfirmBan] = useState(false);
  const [circle, setCircle] = useState(p.circleId ?? "");
  const [notes, setNotes] = useState(p.notes);
  const [delOpen, setDelOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [blockId, setBlockId] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      setMsg(null);
      setMsg(await fn());
      setConfirmBan(false);
    });

  return (
    <div className="admin-actions">
      {msg && (
        <p className={msg.ok ? "notice-inline" : "error"} role="status">
          {msg.message}
        </p>
      )}

      {p.hasProfile && !p.isSelf && (
        <div className="act">
          <h3>Status</h3>
          <div className="row">
            {p.status !== "active" && p.status !== "waitlist" && (
              <button className="btn btn-gold btn-small" disabled={pending} onClick={() => run(() => setStatus(p.id, "active"))}>
                Restore
              </button>
            )}
            {p.status !== "paused" && p.status !== "banned" && (
              <button className="btn btn-outline btn-small" disabled={pending} onClick={() => run(() => setStatus(p.id, "paused"))}>
                Pause
              </button>
            )}
            {p.status !== "banned" &&
              (confirmBan ? (
                <>
                  <button className="btn btn-danger btn-small" disabled={pending} onClick={() => run(() => setStatus(p.id, "banned"))}>
                    Yes, ban him
                  </button>
                  <button className="link-button" onClick={() => setConfirmBan(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-danger btn-small" disabled={pending} onClick={() => setConfirmBan(true)}>
                  Ban
                </button>
              ))}
          </div>
          <p className="admin-sub">Pause hides him from his Circle. Ban also blocks him from signing in.</p>
        </div>
      )}

      {p.hasProfile && (
        <div className="act">
          <h3>Circle</h3>
          <div className="row">
            <label className="visually-hidden" htmlFor="circle">
              Circle
            </label>
            <select id="circle" className="input" value={circle} onChange={(e) => setCircle(e.target.value)}>
              <option value="" disabled>
                Pick a Circle
              </option>
              {p.circles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              className="btn btn-outline btn-small"
              disabled={pending || !circle || circle === p.circleId}
              onClick={() => run(() => moveToCircle(p.id, circle))}
            >
              Move him
            </button>
          </div>
        </div>
      )}

      {p.hasProfile && (
        <div className="act">
          <h3>Checks</h3>
          <div className="row">
            <button className="btn btn-outline btn-small" disabled={pending} onClick={() => run(() => resetAttempts(p.id, "realness"))}>
              Reset Realness tries
            </button>
            <button className="btn btn-outline btn-small" disabled={pending} onClick={() => run(() => resetAttempts(p.id, "id"))}>
              Reset ID tries
            </button>
            <button className="btn btn-outline btn-small" disabled={pending} onClick={() => run(() => redoCheck(p.id, "realness"))}>
              Make him redo Realness
            </button>
            <button className="btn btn-outline btn-small" disabled={pending} onClick={() => run(() => redoCheck(p.id, "id"))}>
              Make him redo ID
            </button>
          </div>
        </div>
      )}

      {p.hasProfile && (
        <div className="act">
          <h3>Private notes</h3>
          <label className="visually-hidden" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only admins see this." />
          <div>
            <button className="btn btn-outline btn-small" disabled={pending || notes === p.notes} onClick={() => run(() => saveNotes(p.id, notes))}>
              Save notes
            </button>
          </div>
        </div>
      )}

      {p.viewerIsGod && !p.isSelf && (
        <div className="act">
          <h3>Admin access</h3>
          <p className="admin-sub">Now: {p.targetRole === "god" ? "Daddy" : p.targetRole === "mod" ? "Mod" : "none"}</p>
          <div className="row">
            {p.targetRole !== "mod" && (
              <button className="btn btn-outline btn-small" disabled={pending} onClick={() => run(() => setAdminRole(p.id, "mod"))}>
                Make mod
              </button>
            )}
            {p.targetRole !== "god" && (
              <button className="btn btn-outline btn-small" disabled={pending} onClick={() => run(() => setAdminRole(p.id, "god"))}>
                Make Daddy
              </button>
            )}
            {p.targetRole && (
              <button className="btn btn-danger btn-small" disabled={pending} onClick={() => run(() => setAdminRole(p.id, "none"))}>
                Remove admin
              </button>
            )}
          </div>
        </div>
      )}

      {p.viewerIsGod && !p.isSelf && p.targetRole !== "god" && p.confirmName && (
        <div className="act act-danger">
          <h3>Delete account</h3>
          {!delOpen ? (
            <button className="btn btn-danger btn-small" onClick={() => setDelOpen(true)}>
              Delete this account
            </button>
          ) : (
            <>
              <p className="admin-sub">Deletes his login, profile, everything he posted and all his photos, videos and voice clips. This can&apos;t be undone.</p>
              <label className="field">
                <span className="admin-sub">
                  Type <b>{p.confirmName}</b> to confirm
                </span>
                <input className="input input-small" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
              </label>
              <label className="agree">
                <input type="checkbox" checked={blockId} onChange={(e) => setBlockId(e.target.checked)} />
                <span>Block his ID from making a new account</span>
              </label>
              <div className="row">
                <button
                  className="btn btn-danger btn-small"
                  disabled={pending || typed.trim().replace(/^@/, "").toLowerCase() !== p.confirmName.replace(/^@/, "").toLowerCase()}
                  onClick={() => run(() => deleteMember(p.id, typed, blockId))}
                >
                  {pending ? "Deleting..." : "Delete for good"}
                </button>
                <button className="link-button" onClick={() => (setDelOpen(false), setTyped(""))}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
