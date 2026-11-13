// MockMeAI mascot: exact artwork for a nerdy girl with big gold glasses and curly black hair.
// Returns SVG markup (a string) for viewBox "0 0 220 240". Copy as is. Do not redraw or restyle.
// Poses: "wave" (home page), "working" (interview page), "done" (results page).

export type Pose = 'wave' | 'working' | 'done';

const C = {
  hair: 'var(--mascot-color-2b2438)',
  hairD: 'var(--mascot-color-221c30)',
  hairL: 'var(--mascot-color-6a5e8e)',
  hairLD: 'var(--mascot-color-4b4266)',
  skin: 'var(--mascot-color-f0be98)',
  skinD: 'var(--mascot-color-e3a07c)',
  mint: 'var(--mascot-color-5eead4)',
  mintD: 'var(--mascot-color-3fbfae)',
  gold: 'var(--mascot-color-e8b84a)',
  amb: 'var(--mascot-color-f5b94a)',
  coral: 'var(--mascot-color-ff8a6b)',
  ink: 'var(--mascot-color-2b1b1a)',
  cream: 'var(--mascot-color-f6efe0)',
  pink: 'var(--mascot-color-ff8fa8)',
};

const STAR = 'M0 -8 L2.4 -2.4 L8 0 L2.4 2.4 L0 8 L-2.4 2.4 L-8 0 L-2.4 -2.4 Z';

// One round curl clump with a small swirl highlight.
function curl(x: number, y: number, r: number, fill: string, hl: string): string {
  return (
    '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"/>' +
    '<path d="M' + (x - r * 0.5).toFixed(1) + ' ' + (y + r * 0.15).toFixed(1) +
    ' A' + (r * 0.5).toFixed(1) + ' ' + (r * 0.5).toFixed(1) + ' 0 1 1 ' +
    (x + r * 0.1).toFixed(1) + ' ' + (y + r * 0.5).toFixed(1) +
    '" fill="none" stroke="' + hl + '" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>'
  );
}

// Two staggered columns of curls hanging down one side of the head (behind the head).
function side(left: boolean): string {
  let s = '';
  const m = left ? 1 : -1;
  const base = left ? 0 : 220;
  for (let k = 0; k < 7; k++) {
    const y = 96 + k * 12;
    const r = k < 4 ? 11 : k < 6 ? 10 : 9;
    s += curl(base + m * (44 + (k % 2) * 7), y + 4, r, C.hairD, C.hairLD);
  }
  for (let k = 0; k < 7; k++) {
    const y = 96 + k * 12;
    const r = k < 4 ? 11 : k < 6 ? 10 : 9;
    s += curl(base + m * (58 - (k % 2) * 7), y, r, C.hair, C.hairL);
  }
  return s;
}

// Mint hoodie jacket: hood down, drawstrings, zipper, small </> patch.
function body(): string {
  return (
    '<path d="M62 240 L62 198 Q62 164 94 160 L126 160 Q158 164 158 198 L158 240 Z" fill="' + C.mint + '"/>' +
    '<ellipse cx="110" cy="166" rx="38" ry="13" fill="' + C.mintD + '"/>' +
    '<path d="M110 186 V240" stroke="' + C.mintD + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<rect x="106" y="186" width="8" height="6" rx="2" fill="' + C.amb + '"/>' +
    '<g stroke="' + C.cream + '" stroke-width="2.6" stroke-linecap="round"><path d="M100 176 L97 202"/><path d="M120 176 L123 202"/></g>' +
    '<circle cx="97" cy="204" r="2.8" fill="' + C.cream + '"/><circle cx="123" cy="204" r="2.8" fill="' + C.cream + '"/>' +
    '<rect x="128" y="208" width="26" height="15" rx="4" fill="' + C.amb + '"/>' +
    '<text x="141" y="219" text-anchor="middle" style="font-family:inherit;font-size:11px;font-weight:600;fill:' + C.ink + '">&lt;/&gt;</text>'
  );
}

// Hair behind the head: big curly masses on both sides, plus a pencil tucked into the curls.
function hairBack(): string {
  return (
    '<ellipse cx="110" cy="108" rx="54" ry="38" fill="' + C.hairD + '"/>' +
    side(true) + side(false) +
    curl(66, 80, 12, C.hairD, C.hairLD) + curl(154, 80, 12, C.hairD, C.hairLD) +
    curl(54, 92, 11, C.hairD, C.hairLD) + curl(166, 92, 11, C.hairD, C.hairLD) +
    '<path d="M154 100 L172 74" stroke="' + C.amb + '" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="173" cy="72" r="3.6" fill="' + C.pink + '"/>'
  );
}

// Ears, round face, curly crown, curly fringe, two small hair clips (pink and teal).
function head(): string {
  return (
    '<ellipse cx="67" cy="130" rx="6" ry="8" fill="' + C.skin + '"/><ellipse cx="67" cy="130" rx="3" ry="4.5" fill="' + C.skinD + '"/>' +
    '<ellipse cx="153" cy="130" rx="6" ry="8" fill="' + C.skin + '"/><ellipse cx="153" cy="130" rx="3" ry="4.5" fill="' + C.skinD + '"/>' +
    '<ellipse cx="110" cy="126" rx="43" ry="40" fill="' + C.skin + '"/>' +
    curl(76, 84, 10, C.hair, C.hairL) + curl(90, 76, 11, C.hair, C.hairL) + curl(104, 72, 11, C.hair, C.hairL) +
    curl(118, 72, 11, C.hair, C.hairL) + curl(132, 76, 11, C.hair, C.hairL) + curl(146, 84, 10, C.hair, C.hairL) +
    '<path d="M66 122 Q64 78 110 74 Q156 78 154 122 Q146 98 110 96 Q74 98 66 122 Z" fill="' + C.hair + '"/>' +
    curl(80, 90, 8, C.hair, C.hairL) + curl(94, 88, 8, C.hair, C.hairL) + curl(108, 87, 8, C.hair, C.hairL) +
    curl(122, 88, 8, C.hair, C.hairL) + curl(136, 90, 8, C.hair, C.hairL) +
    curl(70, 102, 9, C.hair, C.hairL) + curl(150, 102, 9, C.hair, C.hairL) +
    '<rect x="62" y="84" width="16" height="8" rx="4" transform="rotate(-30 70 88)" fill="' + C.pink + '"/>' +
    '<rect x="58" y="98" width="16" height="8" rx="4" transform="rotate(-20 66 102)" fill="' + C.mint + '"/>'
  );
}

// Thick eyebrows, small nose, rosy cheeks.
function face(m: 'normal' | 'focus' | 'happy'): string {
  const b =
    m === 'focus'
      ? 'M76 100 L102 105 M144 100 L118 105'
      : m === 'happy'
      ? 'M76 103 Q88 92 102 98 M118 98 Q132 92 144 103'
      : 'M76 105 Q88 96 102 102 M118 102 Q132 96 144 105';
  return (
    '<path d="' + b + '" fill="none" stroke="' + C.ink + '" stroke-width="3.6" stroke-linecap="round"/>' +
    '<ellipse cx="110" cy="140" rx="3.4" ry="2.6" fill="var(--mascot-color-e39f7b)"/><circle cx="109" cy="139" r="0.9" fill="var(--mascot-color-fff)" opacity="0.7"/>' +
    '<ellipse cx="78" cy="147" rx="7" ry="4" fill="' + C.pink + '" opacity="0.55"/>' +
    '<ellipse cx="142" cy="147" rx="7" ry="4" fill="' + C.pink + '" opacity="0.55"/>'
  );
}

// Big brown eyes with white sparkles and an upper lash line. They blink (class mm-eye).
function eye1(cx: number, dy: number): string {
  const cy = 126;
  return (
    '<g class="mm-eye">' +
    '<ellipse cx="' + cx + '" cy="' + cy + '" rx="9.5" ry="10.5" fill="var(--mascot-color-fff)"/>' +
    '<circle cx="' + cx + '" cy="' + (cy + dy) + '" r="7" fill="var(--mascot-color-7a4a2e)"/>' +
    '<circle cx="' + cx + '" cy="' + (cy + dy) + '" r="3.4" fill="' + C.ink + '"/>' +
    '<circle cx="' + (cx + 2.6) + '" cy="' + (cy + dy - 3) + '" r="2.5" fill="var(--mascot-color-fff)"/>' +
    '<circle cx="' + (cx - 2.6) + '" cy="' + (cy + dy + 3) + '" r="1.2" fill="var(--mascot-color-fff)"/>' +
    '<path d="M' + (cx - 10) + ' ' + (cy - 3) + ' Q' + cx + ' ' + (cy - 15) + ' ' + (cx + 10) + ' ' + (cy - 3) +
    '" fill="none" stroke="' + C.ink + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '</g>'
  );
}

function eyes(m: 'open' | 'down' | 'happy'): string {
  if (m === 'happy') {
    return '<path d="M80 130 Q90 119 100 130 M120 130 Q130 119 140 130" fill="none" stroke="' + C.ink + '" stroke-width="3.2" stroke-linecap="round"/>';
  }
  const dy = m === 'down' ? 3 : 0;
  return eye1(90, dy) + eye1(130, dy);
}

// Big round gold glasses. glow = true gives teal glowing lenses (laptop light).
function glasses(glow: boolean): string {
  const f = glow ? C.mint : 'var(--mascot-color-fff)';
  const o = glow ? 0.35 : 0.12;
  return (
    '<circle cx="90" cy="126" r="17" fill="' + f + '" fill-opacity="' + o + '" stroke="' + C.gold + '" stroke-width="3.4"/>' +
    '<circle cx="130" cy="126" r="17" fill="' + f + '" fill-opacity="' + o + '" stroke="' + C.gold + '" stroke-width="3.4"/>' +
    '<path d="M107 124 Q110 120 113 124 M73 123 L66 121 M147 123 L154 121" fill="none" stroke="' + C.gold + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M78 118 Q82 111 90 110 M118 118 Q122 111 130 110" fill="none" stroke="var(--mascot-color-fff)" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>'
  );
}

function mouth(k: 'o' | 'big'): string {
  if (k === 'o') return '<ellipse cx="110" cy="153" rx="3.6" ry="4.4" fill="var(--mascot-color-7a2e45)"/>';
  return '<path d="M101 148 Q110 162 119 148 Z" fill="var(--mascot-color-7a2e45)"/><ellipse cx="110" cy="156" rx="4" ry="2.2" fill="var(--mascot-color-ff8fa8)"/>';
}

function sleeve(d: string): string {
  return '<path d="' + d + '" fill="none" stroke="' + C.mint + '" stroke-width="17" stroke-linecap="round"/>';
}

function sparkle(x: number, y: number, delay: number): string {
  return (
    '<g transform="translate(' + x + ',' + y + ')">' +
    '<path class="mm-tw mm-fx" style="animation-delay:' + delay + 's" d="' + STAR + '" fill="' + C.amb + '"/></g>'
  );
}

// HOME PAGE: holds a closed laptop under one arm, waves with the other hand, says "hi!".
function wave(): string {
  return (
    body() + hairBack() + head() + face('normal') + eyes('open') + glasses(false) + mouth('big') +
    '<g transform="rotate(-10 58 214)">' +
    '<rect x="30" y="200" width="56" height="30" rx="5" fill="' + C.cream + '"/>' +
    '<circle cx="46" cy="214" r="6" fill="var(--mascot-color-2fb5a3)"/><circle cx="46" cy="214" r="2.2" fill="' + C.amb + '"/>' +
    '<rect x="62" y="207" width="9" height="9" rx="2" fill="' + C.coral + '"/>' +
    '<path d="M30 224 H86" stroke="var(--mascot-color-d9cfb8)" stroke-width="2"/></g>' +
    sleeve('M70 184 Q56 204 62 222') + '<circle cx="74" cy="224" r="7.5" fill="' + C.skin + '"/>' +
    '<g class="mm-wave" style="transform-origin:150px 180px">' +
    sleeve('M150 180 L172 138') +
    '<circle cx="175" cy="129" r="8.5" fill="' + C.skin + '"/>' +
    '<ellipse cx="166" cy="126" rx="3" ry="5" transform="rotate(-25 166 126)" fill="' + C.skin + '"/></g>' +
    '<g class="mm-bubble"><rect x="150" y="38" width="42" height="22" rx="11" fill="' + C.cream + '"/>' +
    '<polygon points="160,59 168,59 158,68" fill="' + C.cream + '"/>' +
    '<text x="171" y="54" text-anchor="middle" style="font-family:inherit;font-size:13px;font-weight:600;fill:' + C.ink + '">hi!</text></g>'
  );
}

// INTERVIEW PAGE: typing hard on an open laptop, teal glowing lenses, sweat drop, coffee.
function working(): string {
  return (
    body() + hairBack() + head() + face('focus') + eyes('down') + glasses(true) + mouth('o') +
    sleeve('M72 186 Q58 216 84 228') + sleeve('M148 186 Q162 216 136 228') +
    '<rect x="62" y="184" width="96" height="46" rx="6" fill="var(--mascot-color-1e2b45)" stroke="var(--mascot-color-cfd8ea)" stroke-width="3"/>' +
    '<rect class="mm-ln" x="72" y="193" width="50" height="4" rx="2" fill="' + C.mint + '"/>' +
    '<rect class="mm-ln" style="animation-delay:-.4s" x="72" y="201" width="34" height="4" rx="2" fill="' + C.amb + '"/>' +
    '<rect class="mm-ln" style="animation-delay:-.8s" x="72" y="209" width="44" height="4" rx="2" fill="' + C.cream + '"/>' +
    '<rect class="mm-ln" style="animation-delay:-.2s" x="72" y="217" width="26" height="4" rx="2" fill="' + C.coral + '"/>' +
    '<rect x="54" y="230" width="112" height="9" rx="4.5" fill="var(--mascot-color-8fa0c4)"/>' +
    '<circle class="mm-ty" cx="84" cy="232" r="7" fill="' + C.skin + '"/>' +
    '<circle class="mm-ty" style="animation-delay:-.15s" cx="136" cy="232" r="7" fill="' + C.skin + '"/>' +
    '<path class="mm-sw" d="M164 100 Q170 110 164 116 Q158 110 164 100 Z" fill="var(--mascot-color-8fd3ff)" opacity="0"/>' +
    '<rect x="172" y="212" width="24" height="24" rx="5" fill="' + C.cream + '"/>' +
    '<path d="M196 218 q10 0 10 8 q0 8 -10 8" fill="none" stroke="' + C.cream + '" stroke-width="3.5"/>' +
    '<g fill="none" stroke="var(--mascot-color-c9d3e8)" stroke-width="2" stroke-linecap="round" opacity="0">' +
    '<path class="mm-steam" d="M180 206 q-3 -5 0 -10"/>' +
    '<path class="mm-steam" style="animation-delay:-.7s" d="M189 206 q-3 -5 0 -10"/></g>'
  );
}

// RESULTS PAGE: cheering with both arms up, happy closed eyes, checkmark badge, sparkles.
function done(): string {
  return (
    body() + hairBack() + head() + face('happy') + eyes('happy') + glasses(false) + mouth('big') +
    '<g class="mm-cheer">' +
    sleeve('M72 182 L48 134') + '<circle cx="45" cy="126" r="8.5" fill="' + C.skin + '"/>' +
    sleeve('M148 182 L172 134') + '<circle cx="175" cy="126" r="8.5" fill="' + C.skin + '"/></g>' +
    '<rect x="14" y="224" width="58" height="12" rx="4" fill="' + C.cream + '"/>' +
    '<circle cx="28" cy="230" r="3" fill="var(--mascot-color-2fb5a3)"/><path d="M14 233 H72" stroke="var(--mascot-color-d9cfb8)" stroke-width="1.5"/>' +
    '<g class="mm-badge mm-fx"><circle cx="168" cy="52" r="16" fill="' + C.mint + '"/>' +
    '<path d="M160 53 L166 59 L177 46" fill="none" stroke="' + C.ink + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>' +
    sparkle(30, 96, 0) + sparkle(190, 100, -0.5) + sparkle(24, 156, -0.9) + sparkle(196, 156, -0.3)
  );
}

export function buildMascot(pose: Pose): string {
  if (pose === 'working') return working();
  if (pose === 'done') return done();
  return wave();
}
