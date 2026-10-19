import { acceptBiometric } from "@/app/agree/actions";

// Shown before the Realness Check and the ID check until he agrees to the face-matching notice.
export default function BiometricConsent({ back, missing }: { back: "/verify" | "/verify/id"; missing?: boolean }) {
  return (
    <div className="wrap prose">
      <h2>Before your face gets scanned</h2>
      <p>To prove you&apos;re real and 18+, we compare faces. Here&apos;s exactly what happens:</p>
      <ul>
        <li>
          Your phone films a few seconds of you following prompts. Six still frames get saved so we can check them against your
          profile photo.
        </li>
        <li>
          For your ID check, we read your ID and compare its photo to those frames. <b>We don&apos;t keep pictures of your ID</b>, and we
          don&apos;t keep your ID number. We keep a scrambled one-way fingerprint so one ID can&apos;t open two accounts.
        </li>
        <li>
          Face measurements are calculated, compared, and thrown away. <b>We never store face measurements, and never sell,
          rent or share any of this.</b>
        </li>
        <li>The saved frames are deleted once your ID check passes, or after 90 days if you never do it. Deleting your account deletes everything.</li>
      </ul>
      <p>
        Full details in our <a href="/biometrics" target="_blank">Biometric and ID Notice</a>.
      </p>
      <form action={acceptBiometric} className="stack">
        <input type="hidden" name="back" value={back} />
        <label className="agree">
          <input type="checkbox" name="agree" required />
          <span>I agree to Homosocial collecting and using my face images and ID the way the Biometric and ID Notice describes.</span>
        </label>
        {missing && <p className="error" role="alert">Check the box to keep going.</p>}
        <button className="btn btn-pink btn-full" type="submit">
          I agree, let&apos;s go
        </button>
      </form>
    </div>
  );
}
