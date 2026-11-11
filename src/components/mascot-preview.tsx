"use client";
import {
  useMascotPreference,
  MascotToggle,
} from "@/components/mascot-preference";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Pose } from "@/components/mascot-art/mascotArt";
import { MascotAppearance } from "@/components/mascot-appearance";

function PreviewPose({ pose }: { pose: Pose }) {
  const enabled = useMascotPreference();
  const [visit, setVisit] = useState(0);
  const [show, setShow] = useState(false);
  const finish = useCallback(() => setShow(false), []);
  return (
    <section className="mascot-preview-pose">
      <h2>{pose}</h2>
      <div className="mascot-preview-stage">
        {show && enabled && (
          <MascotAppearance
            key={visit}
            pose={pose}
            centered={pose === "working"}
            onDone={finish}
            preview
          />
        )}
      </div>
      <button
        className="practice-primary"
        disabled={!enabled}
        onClick={() => {
          setVisit((v) => v + 1);
          setShow(true);
        }}
      >
        Replay {pose}
      </button>
    </section>
  );
}
export function MascotPreview() {
  return (
    <main className="practice-page">
      <div className="practice-shell">
        <header className="practice-nav">
          <Link href="/">Back to MockMeAI</Link>
          <ThemeToggle />
        </header>
        <div className="mt-4">
          <MascotToggle />
        </div>
        <h1 className="mt-8 text-3xl">Supplied mascot preview</h1>
        <p className="mt-3">
          Original artwork, at its actual app sizes: 112px / 80px / 100px. Each
          visit unmounts.
        </p>
        <div className="mascot-preview-poses">
          {(["wave", "working", "done"] as const).map((pose) => (
            <PreviewPose key={pose} pose={pose} />
          ))}
        </div>
      </div>
    </main>
  );
}
