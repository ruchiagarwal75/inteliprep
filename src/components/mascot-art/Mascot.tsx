'use client';

import { buildMascot, type Pose } from './mascotArt';
import './mascot.css';

// Renders the mascot artwork. Size is controlled by the parent (set height or width in CSS).
// The artwork is a fixed string made in this repo, so dangerouslySetInnerHTML is safe here.
export default function Mascot({ pose }: { pose: Pose }) {
  return (
    <svg
      className="mm-svg"
      viewBox="0 0 220 240"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: '<g class="mm-idle">' + buildMascot(pose) + '</g>' }}
    />
  );
}
