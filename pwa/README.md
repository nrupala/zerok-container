# PWA Creator

Minimal PWA template - no frameworks, everything from scratch.

## Quick Start

1. Clone or use as template
2. Customize in `index.html` (name, title)
3. Add icons (`icon-192.png`, `icon-512.png`)
4. Deploy to any static host

## Files

| File | Purpose |
|------|--------|
| `index.html` | Main HTML |
| `styles.css` | Styling (CSS only) |
| `app.js` | App logic + crypto |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker |

## Features

- Zero-knowledge encryption (AES-GCM)
- PBKDF2 key derivation (100k iterations)
- Offline-first (service worker)
- Dark/light theme support
- No dependencies

## Deployment

### GitHub Pages
```bash
git push origin main
```
Go to Settings → Pages → Deploy from main branch.

### Netlify
Drag and drop the folder to Netlify.

### Cloudflare Pages
Connect GitHub repo, deploy from main.

## Customization

### Change App Name
Edit `index.html`:
```html
<title>Your App</title>
<h1>Your App</h1>
```

Edit `manifest.json`:
```json
{
  "name": "Your App",
  "short_name": "YourApp"
}
```

### Add Icons
Create 192x192 and 512x512 PNG icons:
- `icon-192.png`
- `icon-512.png`

### Colors
Edit `styles.css`:
```css
:root {
  --bg: #your-color;
  --accent: #your-accent;
}
```

## GitHub Actions

The workflow validates PWA structure on push.

Trigger: Push to main or manual run via Actions tab.