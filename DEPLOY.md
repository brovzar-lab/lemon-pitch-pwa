# Deployment Instructions

## Prerequisites
- LEMA-5346 must be complete (backend live at `https://pitches-api.lemonvirtual.studio`)
- Hostinger VPS with nginx + certbot

## 1. Set the backend URL

```bash
cp .env.example .env.local
# Edit .env.local: set VITE_API_URL=https://pitches-api.lemonvirtual.studio
```

## 2. Build

```bash
npm install --include=dev
npm run build
# Output: dist/
```

## 3. Upload to VPS

```bash
scp -r dist/* root@<vps-ip>:/var/www/lemon-pitch-pwa/
```

Or from the VPS:
```bash
mkdir -p /var/www/lemon-pitch-pwa
# copy dist/ contents there
```

## 4. nginx config

```bash
cp nginx.conf /etc/nginx/sites-available/lemon-pitch-pwa
ln -s /etc/nginx/sites-available/lemon-pitch-pwa /etc/nginx/sites-enabled/
certbot --nginx -d pitch.lemonvirtual.studio
nginx -t && systemctl reload nginx
```

## 5. Verify PWA install

1. Open `https://pitch.lemonvirtual.studio` in iPhone Safari
2. Tap Share → Add to Home Screen
3. App installs with the Lemon Studios tree icon

## Demo mode

Leave `VITE_API_URL` empty in `.env.local` to run in demo mode (no backend required).
The app shows realistic mock data and all interactions work.
