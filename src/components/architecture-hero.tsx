"use client";

import { useEffect, useId, useRef } from "react";

function AppServer({ y, index }: { y: number; index: number }) {
  return (
    <g className={`arch-server arch-server-${index}`}>
      <rect
        x="320"
        y={y}
        width="100"
        height="40"
        rx="8"
        className="arch-server-box"
      />
      <circle cx="333" cy={y + 20} r="3" className="arch-led arch-led-teal" />
      <circle cx="344" cy={y + 20} r="3" className="arch-led arch-led-amber" />
      <circle cx="355" cy={y + 20} r="3" className="arch-led arch-led-coral" />
      <path d={`M374 ${y + 15}h30m-30 10h22`} className="arch-server-bars" />
    </g>
  );
}

/** Decorative, lightweight architecture: CSS animates transforms, opacity and outline stroke. */
export function ArchitectureHero() {
  const id = `architecture-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => {
      if (ref.current)
        ref.current.dataset.motionPaused = String(document.hidden);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const cylinder = "M540 240a38 12 0 0 1 76 0v42a38 12 0 0 1-76 0Z";
  return (
    <div className="architecture-hero" ref={ref} data-motion-paused="true">
      <svg
        viewBox="0 0 680 350"
        width="680"
        height="350"
        role="img"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
      >
        <title id={`${id}-title`}>
          A small architecture, one request at a time
        </title>
        <desc id={`${id}-desc`}>
          You send a request from a laptop through a load balancer to three app
          servers, a cache and a database. Three teal packets follow different
          request paths; their destination briefly pulses amber. Motion pauses
          in hidden tabs and becomes a still illustration when reduced motion is
          preferred.
        </desc>
        <defs>
          <pattern
            id={`${id}-grid`}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.8" className="arch-grid-dot" />
          </pattern>
        </defs>
        <rect width="680" height="350" rx="12" className="arch-panel" />
        <rect
          width="680"
          height="350"
          rx="12"
          fill={`url(#${id}-grid)`}
          className="arch-grid"
        />
        <path
          d="M634 24c-13 4-18 19-9 29 3 4 7 6 12 7-18 3-31-11-27-25 3-7 12-12 24-11Z"
          className="arch-moon"
        />
        <path d="M450 37v8m-4-4h8" className="arch-star arch-star-one" />
        <path d="M111 62v6m-3-3h6" className="arch-star arch-star-two" />
        <circle
          cx="595"
          cy="187"
          r="1.3"
          className="arch-star arch-star-three"
        />
        <g className="arch-wires">
          <path d="M126 184h59m60 0h75M280 184v-76h40m-40 76v76h40M420 108h130m-130 76h50m-50 76h120M470 108v152" />
          <path d="M578 138v90" className="arch-dashed-wire" />
        </g>
        <g className="arch-laptop">
          <rect
            x="38"
            y="151"
            width="88"
            height="57"
            rx="6"
            className="arch-laptop-body"
          />
          <rect
            x="44"
            y="157"
            width="76"
            height="45"
            rx="2"
            className="arch-laptop-screen"
          />
          <path d="m29 208 107 0-8 9H37Z" className="arch-laptop-body" />
          <path d="M71 211h23" className="arch-laptop-trackpad" />
          <path
            d="M56 110h44a7 7 0 0 1 7 7v18a7 7 0 0 1-7 7H79l-9 7v-7H56a7 7 0 0 1-7-7v-18a7 7 0 0 1 7-7Z"
            className="arch-speech"
          />
          {[66, 78, 90].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy="126"
              r="2.6"
              className={`arch-speaking-dot arch-speaking-dot-${i}`}
            />
          ))}
        </g>
        <circle cx="215" cy="184" r="30" className="arch-balancer" />
        <path
          d="M201 184h11m0 0v-10h13m-13 10h13m-13 0v10h13m-4-24 4 4-4 4m0 2 4 4-4 4m0 2 4 4-4 4"
          className="arch-split-arrow"
        />
        {[88, 164, 240].map((y, i) => (
          <AppServer y={y} index={i + 1} key={y} />
        ))}
        <g className="arch-cache-pulse">
          <rect
            x="550"
            y="80"
            width="56"
            height="56"
            rx="10"
            className="arch-cache"
          />
          <path
            d="m581 88-17 24h13l-5 17 22-27h-14l6-14Z"
            className="arch-lightning"
          />
          <rect
            x="550"
            y="80"
            width="56"
            height="56"
            rx="10"
            className="arch-arrival-outline arch-cache-outline"
          />
        </g>
        <g className="arch-db-pulse-two">
          <g className="arch-db-pulse-three">
            <path d={cylinder} className="arch-database" />
            <ellipse
              cx="578"
              cy="240"
              rx="38"
              ry="12"
              className="arch-database-top"
            />
            <path
              d="M540 254a38 12 0 0 0 76 0m-76 14a38 12 0 0 0 76 0"
              className="arch-database-bands"
            />
            <path
              d={cylinder}
              className="arch-arrival-outline arch-db-outline-two"
            />
            <path
              d={cylinder}
              className="arch-arrival-outline arch-db-outline-three"
            />
          </g>
        </g>
        <g className="arch-labels">
          <text x="82" y="252">
            You
          </text>
          <text x="215" y="252">
            Load balancer
          </text>
          <text x="370" y="310">
            App servers
          </text>
          <text x="578" y="164">
            Cache
          </text>
          <text x="578" y="316">
            Database
          </text>
        </g>
        {[1, 2, 3].map((i) => (
          <g className={`arch-packet arch-packet-${i}`} key={i}>
            <rect x="-4" y="-4" width="8" height="8" rx="2" />
          </g>
        ))}
      </svg>
    </div>
  );
}
