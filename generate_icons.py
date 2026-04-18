#!/usr/bin/env python3
"""Generate PWA icons using pure Python - placeholder"""

import base64

# 192x192 blue square PNG (minimal valid PNG)
ICON_192 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAABmJLR0QA/wD/AP+hvaeT"
    "AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAB3RJT0H5+sHgdIB4QAABNSURBVHja7cEBDQAA"
    "AMKg909tDjegAAAAAAAAAAAAAAAAAAAAAAAAAAAAANB8NgAAAFRJREFUeNnt0DEBAAAIAwLB"
    "f8RgAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACw5g8DAIp5"
    "GQAAAAD/md4hSwAAAABJRU5ErkJggg=="
)

def write_icons():
    with open("pwa/icon-192.png", "wb") as f:
        f.write(ICON_192)
    with open("pwa/icon-512.png", "wb") as f:
        f.write(ICON_192)
    print("Icons created: pwa/icon-192.png, pwa/icon-512.png")

if __name__ == "__main__":
    write_icons()