"""Copy the supplied branding unchanged. Accept a ZIP or a directory, never redraw."""
from pathlib import Path
import hashlib
import json
import sys
import zipfile

NAMES = [
    'shardling-lockup.svg', 'shardling-lockup-badge.svg', 'shardling-mark.svg',
    'favicon.ico', 'favicon.svg', 'favicon-16.png', 'favicon-32.png',
    'apple-touch-icon-180.png', 'icon-192.png', 'icon-512.png',
    'og-image-1200x630.png', 'shardling-icon.svg',
]
source = Path(sys.argv[1])
if source.is_dir():
    candidates = list(source.rglob('*'))
    files = {}
    for name in NAMES:
        matches = [p for p in candidates if p.is_file() and p.name == name]
        if len(matches) != 1:
            raise SystemExit(f'Expected exactly one {name}')
        files[name] = matches[0].read_bytes()
else:
    with zipfile.ZipFile(source) as archive:
        files = {}
        for name in NAMES:
            matches = [n for n in archive.namelist() if Path(n).name == name and not n.endswith('/')]
            if len(matches) != 1:
                raise SystemExit(f'Expected exactly one {name}')
            files[name] = archive.read(matches[0])
# Validate the whole set before changing files. Only known basenames are copied.
target = Path('public/brand')
target.mkdir(parents=True, exist_ok=True)
for name, data in files.items():
    (target / name).write_bytes(data)
ALIASES = {
    'src/app/favicon.ico': 'favicon.ico',
    'src/app/icon.svg': 'favicon.svg',
    'src/app/apple-icon.png': 'apple-touch-icon-180.png',
    'public/brand-mark.svg': 'shardling-mark.svg',
    'public/brand-lockup.svg': 'shardling-lockup.svg',
    'public/favicon.svg': 'favicon.svg',
    'public/favicon-32x32.png': 'favicon-32.png',
    'public/apple-touch-icon.png': 'apple-touch-icon-180.png',
    'public/icon-192.png': 'icon-192.png',
    'public/icon-512.png': 'icon-512.png',
    'public/og-image.png': 'og-image-1200x630.png',
}
for alias, original in ALIASES.items():
    Path(alias).write_bytes(files[original])
manifest = {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}
Path('scripts/brand-asset-sha256.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Copied {len(files)} supplied assets byte-for-byte and updated Next icons and compatibility aliases.')
