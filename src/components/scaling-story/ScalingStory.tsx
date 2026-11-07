'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './scalingStory.css';

// "How a system scales" animation for MockMeAI. Seven short steps that loop:
// 1 user, traffic spike, scale out, add database, database overload, cache saves it, handled.
// Copy as is. Do not redraw or restyle. Props only change behavior, not the artwork.

const NAMES = ['1 user', 'Spike', 'Scale out', 'Add DB', 'DB overload', 'Cache saves it', 'Handled'];
const CAPS = [
  'One user, one server. Everything is easy.',
  'Traffic spike! One server cannot keep up and starts to sweat.',
  'Add a load balancer and more servers. The traffic is shared.',
  'The servers need to store and read data, so we add a database.',
  'Now every server hits the database at once. It gets overloaded!',
  'Add a cache. It answers most requests, so the database can relax.',
  'Handled! That is how a system scales.',
];

const INK = '#2B1B3A';
const STAR = 'M0 -8 L2.4 -2.4 L8 0 L2.4 2.4 L0 8 L-2.4 2.4 L-8 0 L-2.4 -2.4 Z';
const UY = [50, 110, 170, 230, 290];
const SY = [70, 170, 270];
const UC = ['#FF8FA8', '#B9A7FF', '#5EEAD4', '#F5B94A', '#FF8A6B'];
const LN = 'fill="none" stroke="#3A4F7C" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round"';
const FONT = 'font-family:inherit;';

// Wraps content so it is only visible between stage f and stage t (inclusive).
function G(f: number, t: number, inner: string, pop?: boolean): string {
  return '<g data-f="' + f + '" data-t="' + t + '"' + (pop ? ' data-pop="1"' : '') + ' style="opacity:0">' + inner + '</g>';
}

// A small packet that travels along a path in a loop.
function pkt(path: string, dur: number, begin: number, col: string): string {
  return (
    '<rect x="-5" y="-5" width="10" height="10" rx="3" fill="' + col + '" opacity="0">' +
    '<animateMotion dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite" path="' + path + '"/>' +
    '<animate attributeName="opacity" dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.08;0.88;1"/></rect>'
  );
}

function eyes(cx: number, cy: number, dx: number, r: number): string {
  const one = (x: number) =>
    '<g class="ss-eye"><circle cx="' + x + '" cy="' + cy + '" r="' + r + '" fill="' + INK + '"/>' +
    '<circle cx="' + (x + 1) + '" cy="' + (cy - 1) + '" r="' + r * 0.35 + '" fill="#fff"/></g>';
  return one(cx - dx) + one(cx + dx);
}

function srv(cx: number, cy: number, fill: string): string {
  return (
    '<line x1="' + cx + '" y1="' + (cy - 26) + '" x2="' + cx + '" y2="' + (cy - 34) + '" stroke="#F6EFE0" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="' + cx + '" cy="' + (cy - 37) + '" r="3" fill="#F5B94A"/>' +
    '<rect x="' + (cx - 42) + '" y="' + (cy - 26) + '" width="84" height="52" rx="14" fill="' + fill + '"/>' +
    eyes(cx, cy - 4, 12, 3.4) +
    '<ellipse cx="' + (cx - 22) + '" cy="' + (cy + 6) + '" rx="6" ry="3.4" fill="#FF8FA8" opacity="0.8"/>' +
    '<ellipse cx="' + (cx + 22) + '" cy="' + (cy + 6) + '" rx="6" ry="3.4" fill="#FF8FA8" opacity="0.8"/>' +
    '<path d="M' + (cx - 6) + ' ' + (cy + 6) + ' Q' + cx + ' ' + (cy + 13) + ' ' + (cx + 6) + ' ' + (cy + 6) + '" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>'
  );
}

function srvStress(cx: number, cy: number): string {
  return (
    '<g class="ss-shake"><rect x="' + (cx - 42) + '" y="' + (cy - 26) + '" width="84" height="52" rx="14" fill="#FF6B6B"/>' +
    '<circle cx="' + (cx - 12) + '" cy="' + (cy - 4) + '" r="7" fill="#fff"/><circle cx="' + (cx + 12) + '" cy="' + (cy - 4) + '" r="7" fill="#fff"/>' +
    '<circle cx="' + (cx - 12) + '" cy="' + (cy - 2) + '" r="2.4" fill="' + INK + '"/><circle cx="' + (cx + 12) + '" cy="' + (cy - 2) + '" r="2.4" fill="' + INK + '"/>' +
    '<path d="M' + (cx - 10) + ' ' + (cy + 12) + ' q5 -6 10 0 q5 6 10 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M' + (cx - 20) + ' ' + (cy - 15) + ' L' + (cx - 6) + ' ' + (cy - 11) + ' M' + (cx + 20) + ' ' + (cy - 15) + ' L' + (cx + 6) + ' ' + (cy - 11) + '" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path class="ss-sw" d="M' + (cx + 38) + ' ' + (cy - 22) + ' q5 8 0 12 q-5 -4 0 -12Z" fill="#8FD3FF"/></g>'
  );
}

function db(cx: number, body: string, top: string): string {
  return (
    '<rect x="' + (cx - 30) + '" y="150" width="60" height="46" fill="' + body + '"/>' +
    '<ellipse cx="' + cx + '" cy="196" rx="30" ry="9" fill="' + body + '"/>' +
    '<ellipse cx="' + cx + '" cy="150" rx="30" ry="9" fill="' + top + '"/>' +
    eyes(cx, 172, 9, 3.2) +
    '<path d="M' + (cx - 4) + ' 181 Q' + cx + ' 186 ' + (cx + 4) + ' 181" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<ellipse cx="' + (cx - 17) + '" cy="180" rx="4.5" ry="2.6" fill="#FF8FA8" opacity="0.7"/>' +
    '<ellipse cx="' + (cx + 17) + '" cy="180" rx="4.5" ry="2.6" fill="#FF8FA8" opacity="0.7"/>'
  );
}

function dbStress(cx: number): string {
  return (
    '<g class="ss-shake"><rect x="' + (cx - 30) + '" y="150" width="60" height="46" fill="#FF6B6B"/>' +
    '<ellipse cx="' + cx + '" cy="196" rx="30" ry="9" fill="#FF6B6B"/><ellipse cx="' + cx + '" cy="150" rx="30" ry="9" fill="#FF9A9A"/>' +
    '<circle cx="' + (cx - 9) + '" cy="172" r="6.5" fill="#fff"/><circle cx="' + (cx + 9) + '" cy="172" r="6.5" fill="#fff"/>' +
    '<circle cx="' + (cx - 9) + '" cy="174" r="2.3" fill="' + INK + '"/><circle cx="' + (cx + 9) + '" cy="174" r="2.3" fill="' + INK + '"/>' +
    '<path d="M' + (cx - 8) + ' 187 q4 -5 8 0 q4 5 8 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M' + (cx - 17) + ' 161 L' + (cx - 4) + ' 165 M' + (cx + 17) + ' 161 L' + (cx + 4) + ' 165" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path class="ss-sw" d="M' + (cx + 30) + ' 156 q5 8 0 12 q-5 -4 0 -12Z" fill="#8FD3FF"/></g>'
  );
}

function user(cx: number, cy: number, c: string): string {
  return (
    '<circle cx="' + cx + '" cy="' + cy + '" r="15" fill="' + c + '"/>' + eyes(cx, cy - 2, 5, 1.9) +
    '<path d="M' + (cx - 4) + ' ' + (cy + 5) + ' Q' + cx + ' ' + (cy + 9) + ' ' + (cx + 4) + ' ' + (cy + 5) + '" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>'
  );
}

function label(x: number, y: number, t: string): string {
  return '<text x="' + x + '" y="' + y + '" text-anchor="middle" style="' + FONT + 'fill:#A8B5D1;font-size:12px">' + t + '</text>';
}

function buildArt(patId: string): string {
  const DBX = 570;
  const CX = 465;
  const dPaths = ['M382 70 C450 70 480 170 540 170', 'M382 170 L540 170', 'M382 270 C450 270 480 170 540 170'];
  const cPaths = ['M382 70 C410 70 415 170 440 170', 'M382 170 L440 170', 'M382 270 C410 270 415 170 440 170'];

  let s =
    '<defs><pattern id="' + patId + '" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#2A3B63"/></pattern></defs>' +
    '<rect width="680" height="340" rx="12" fill="#141C30"/><rect width="680" height="340" rx="12" fill="url(#' + patId + ')"/>' +
    '<circle cx="636" cy="40" r="12" fill="#F6E3B4"/><circle cx="642" cy="37" r="10" fill="#141C30"/>' +
    '<g fill="#F6EFE0"><circle cx="560" cy="30" r="1.5"/><circle cx="520" cy="60" r="1.2"/><circle cx="120" cy="30" r="1.4"/><circle cx="250" cy="40" r="1.2"/></g>';

  // Dotted lines
  s += G(0, 0, '<path d="M76 170 L298 170" ' + LN + '/>');
  UY.forEach((y) => { s += G(1, 1, '<path d="M76 ' + y + ' C180 ' + y + ' 210 170 298 170" ' + LN + '/>'); });
  UY.forEach((y) => { s += G(2, 6, '<path d="M76 ' + y + ' C120 ' + y + ' 130 170 172 170" ' + LN + '/>'); });
  SY.forEach((y) => { s += G(2, 6, '<path d="M228 170 C258 170 268 ' + y + ' 298 ' + y + '" ' + LN + '/>'); });
  dPaths.forEach((p) => { s += G(3, 4, '<path d="' + p + '" ' + LN + '/>'); });
  cPaths.forEach((p) => { s += G(5, 6, '<path d="' + p + '" ' + LN + '/>'); });
  s += G(5, 6, '<path d="M490 170 L540 170" ' + LN + '/>');

  // Packets
  s += G(0, 0, pkt('M76 170 L298 170', 2.4, 0, '#5EEAD4'));
  UY.forEach((y, i) => { s += G(1, 1, pkt('M76 ' + y + ' C180 ' + y + ' 210 170 298 170', 1.1, i * 0.22, i % 2 ? '#F5B94A' : '#5EEAD4')); });
  const tgt = [0, 1, 2, 0, 1];
  UY.forEach((y, i) => {
    const sy = SY[tgt[i]];
    s += G(2, 6, pkt('M76 ' + y + ' C120 ' + y + ' 130 170 172 170 L228 170 C258 170 268 ' + sy + ' 298 ' + sy, 2.4, i * 0.45, '#5EEAD4'));
  });
  dPaths.forEach((p, i) => { s += G(3, 3, pkt(p, 2.4, i * 0.8, '#5EEAD4')); });
  dPaths.forEach((p, i) => { s += G(4, 4, pkt(p, 0.9, i * 0.3, '#5EEAD4')) + G(4, 4, pkt(p, 0.9, i * 0.3 + 0.45, '#F5B94A')); });
  cPaths.forEach((p, i) => { s += G(5, 6, pkt(p, 1.0, i * 0.33, '#F5B94A')); });
  s += G(5, 6, pkt('M490 170 L540 170', 3, 0.5, '#FF8A6B'));

  // Users
  UY.forEach((y, i) => { s += G(i === 2 ? 0 : 1, 6, user(60, y, UC[i]), i !== 2); });

  // Servers
  s += G(0, 0, srv(340, 170, '#5EEAD4'));
  s += G(1, 1, srvStress(340, 170));
  s += G(2, 6, srv(340, 170, '#5EEAD4'));
  s += G(2, 6, srv(340, 70, '#B9A7FF'), true);
  s += G(2, 6, srv(340, 270, '#FFC9A8'), true);

  // Load balancer with a cone hat
  s += G(
    2, 6,
    '<polygon points="188,146 212,146 200,118" fill="#FF8A6B"/><path d="M192 138 L208 138" stroke="#F6EFE0" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="200" cy="170" r="28" fill="#F5B94A"/>' + eyes(200, 172, 7, 3.2) +
    '<ellipse cx="187" cy="180" rx="4.5" ry="2.6" fill="#FF8FA8" opacity="0.8"/><ellipse cx="213" cy="180" rx="4.5" ry="2.6" fill="#FF8FA8" opacity="0.8"/>' +
    '<path d="M196 181 Q200 186 204 181" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>',
    true,
  );

  // Database: happy, stressed, happy again
  s += G(3, 3, db(DBX, '#2FB5A3', '#7FE3D3'), true);
  s += G(4, 4, dbStress(DBX));
  s += G(5, 6, db(DBX, '#2FB5A3', '#7FE3D3'));

  // Pile of packets and "help!" bubble (database overload step)
  let pile = '';
  [[546, 128], [558, 128], [570, 128], [582, 128], [552, 116], [564, 116], [576, 116], [564, 104]].forEach((p, i) => {
    pile += '<rect class="ss-bounce" style="animation-delay:' + -i * 0.13 + 's" x="' + p[0] + '" y="' + p[1] + '" width="10" height="10" rx="3" fill="' + (i % 2 ? '#F5B94A' : '#5EEAD4') + '"/>';
  });
  s += G(4, 4, pile);
  s += G(4, 4, '<rect x="540" y="62" width="60" height="22" rx="11" fill="#F6EFE0"/><polygon points="562,83 570,83 564,92" fill="#F6EFE0"/><text x="570" y="77" text-anchor="middle" style="' + FONT + 'font-size:13px;font-weight:600;fill:' + INK + '">help!</text>');

  // Cache with a cape, and "phew" bubble
  s += G(
    5, 6,
    '<polygon class="ss-cape" points="490,150 518,158 510,192 490,190" fill="#E0664A"/><rect x="440" y="145" width="50" height="50" rx="14" fill="#FF8A6B"/>' +
    '<path d="M468 150 L460 161 H465 L463 169 L472 157 H467 Z" fill="#F5B94A"/>' + eyes(465, 178, 7, 2.8) +
    '<path d="M461 186 Q465 190 469 186" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>',
    true,
  );
  s += G(5, 5, '<rect x="548" y="118" width="46" height="20" rx="10" fill="#F6EFE0"/><polygon points="566,137 574,137 568,145" fill="#F6EFE0"/><text x="571" y="132" text-anchor="middle" style="' + FONT + 'font-size:12px;font-weight:600;fill:' + INK + '">phew</text>');

  // Labels
  s += G(0, 6, label(60, 322, 'Users'));
  s += G(0, 1, label(340, 222, 'Server'));
  s += G(2, 6, label(340, 322, 'Servers'));
  s += G(2, 6, label(200, 222, 'Load balancer'));
  s += G(3, 6, label(DBX, 222, 'Database'));
  s += G(5, 6, label(CX, 214, 'Cache'));

  // Celebration
  s += G(6, 6, '<g transform="translate(620,100)"><circle r="18" fill="#5EEAD4"/><path d="M-8 1 L-2 7 L9 -6" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>', true);
  [[420, 36, 0], [600, 260, -0.4], [620, 310, -0.8], [150, 36, -0.2], [270, 300, -0.6]].forEach((p) => {
    s += G(6, 6, '<g transform="translate(' + p[0] + ',' + p[1] + ')"><path class="ss-tw" style="animation-delay:' + p[2] + 's" d="' + STAR + '" fill="#F5B94A"/></g>');
  });
  return s;
}

type Props = {
  autoPlay?: boolean; // default true
  intervalMs?: number; // time per step, default 3800
  showCaption?: boolean; // default true
  showControls?: boolean; // default true
  className?: string;
};

export default function ScalingStory({
  autoPlay = true,
  intervalMs = 3800,
  showCaption = true,
  showControls = true,
  className,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const art = useMemo(() => buildArt('ss-dots-' + uid), [uid]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [reduce, setReduce] = useState(false);

  // Reduced motion: no autoplay, no looping animation.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Show or hide each part for the current step.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.querySelectorAll<SVGGElement>('[data-f]').forEach((el) => {
      const on = stage >= Number(el.dataset.f) && stage <= Number(el.dataset.t);
      const was = el.dataset.on === '1';
      el.style.opacity = on ? '1' : '0';
      if (on && !was && el.hasAttribute('data-pop') && !reduce) {
        el.classList.remove('ss-pop');
        void el.getBoundingClientRect();
        el.classList.add('ss-pop');
      }
      el.dataset.on = on ? '1' : '0';
    });
  }, [stage, reduce]);

  // Auto advance. Skips steps while the tab is hidden.
  useEffect(() => {
    if (!playing || reduce) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setStage((s) => (s + 1) % NAMES.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, reduce, intervalMs]);

  // Pause the packet animation when reduced motion is on or the tab is hidden.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const sync = () => {
      if (reduce || document.hidden) svg.pauseAnimations();
      else svg.unpauseAnimations();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [reduce]);

  return (
    <div className={'ss-wrap' + (reduce ? ' ss-still' : '') + (className ? ' ' + className : '')}>
      <svg
        ref={svgRef}
        className="ss-svg"
        viewBox="0 0 680 340"
        width="100%"
        role="img"
        aria-label="Animated story of how a system scales: one server, a traffic spike, a load balancer with more servers, a database, a database overload, and a cache that saves it."
        dangerouslySetInnerHTML={{ __html: art }}
      />
      {showCaption && (
        <p className="ss-cap" aria-live="polite">
          {CAPS[stage]}
        </p>
      )}
      {showControls && (
        <div className="ss-bar">
          {NAMES.map((n, i) => (
            <button
              key={n}
              type="button"
              className={'ss-pill' + (i === stage ? ' ss-act' : '')}
              onClick={() => {
                setPlaying(false);
                setStage(i);
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="ss-pill"
            onClick={() => {
              setStage(0);
              setPlaying(true);
            }}
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
