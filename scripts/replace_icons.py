"""Replace all Android mipmap launcher icons with a custom icon PNG.

Mipmap sizes (launcher icon):
  mdpi    = 48x48
  hdpi    = 72x72
  xhdpi   = 96x96
  xxhdpi  = 144x144
  xxxhdpi = 192x192

The foreground/webp uses the same image for simplicity.
"""

import os
import sys
from PIL import Image

SRC = r"D:\project\ai\ai-project\pmllm\assets\icon.png"
RES_BASE = r"D:\project\ai\ai-project\pmllm\android\app\src\main\res"

SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

FILES_TO_REPLACE = [
    "ic_launcher.webp",
    "ic_launcher_round.webp",
    "ic_launcher_foreground.webp",
]

if not os.path.isfile(SRC):
    print(f"ERROR: Source icon not found: {SRC}")
    sys.exit(1)

img = Image.open(SRC).convert("RGBA")

for dir_name, size in SIZES.items():
    target_dir = os.path.join(RES_BASE, dir_name)
    if not os.path.isdir(target_dir):
        print(f"SKIP dir not found: {target_dir}")
        continue

    resized = img.resize((size, size), Image.LANCZOS)
    for fname in FILES_TO_REPLACE:
        target_path = os.path.join(target_dir, fname)
        # webp save with lossless for clean icon
        resized.save(target_path, "WEBP", lossless=True, quality=100)
        print(f"  [OK] {os.path.relpath(target_path, RES_BASE)}  ({size}x{size})")

print("\nDone! All mipmap icons replaced.")
