"use client";

import CrashScreen from "@/components/CrashScreen";
import "./globals.css";

// When even the page frame fails to load.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body>
        <CrashScreen error={error} />
      </body>
    </html>
  );
}
