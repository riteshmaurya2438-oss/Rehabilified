# Deploy Rehabilified on a Hostinger VPS (Ubuntu)

Your app = **React frontend** + **FastAPI (Python) backend** + **MongoDB**, with **live Razorpay**.
This guide sets up everything on one Hostinger VPS. Replace `YOURDOMAIN.com` with your real domain and `VPS_IP` with your server's IP.

---

## 0) Create the VPS
- Hostinger → Dev tools → **VPS** → create a plan (KVM 1 is fine to start).
- OS template: **Ubuntu 22.04** (plain) or the **Ubuntu + Node.js** template.
- Note your **root password** and **VPS IP address**.

Point your domain to the VPS:
- Hostinger → Domains → DNS → add an **A record**: `@  ->  VPS_IP` and `www -> VPS_IP`.

---

## 1) Connect & install the essentials
Use Hostinger's **Browser terminal** (VPS → Manage → Terminal) or SSH:
```bash
ssh root@VPS_IP
```

Install Python, Node, Nginx, MongoDB, Git:
```bash
apt update && apt upgrade -y
apt install -y python3 python3-venv python3-pip git nginx curl

# Node 20 + Yarn
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn

# MongoDB 7 (Community)
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl enable --now mongod
```

---

## 2) Get your app code onto the VPS
Easiest: push this project to GitHub from Emergent (chat: "save to GitHub"), then:
```bash
cd /opt
git clone https://github.com/<your-username>/<your-repo>.git rehabilified
cd rehabilified
```
(If you prefer, upload a zip via the VPS file manager and unzip into `/opt/rehabilified`.)

Project layout expected: `/opt/rehabilified/backend` and `/opt/rehabilified/frontend`.

---

## 3) Backend (FastAPI)
```bash
cd /opt/rehabilified/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create the backend env file `/opt/rehabilified/backend/.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="rehabilified"
CORS_ORIGINS="*"
RAZORPAY_KEY_ID="rzp_live_TkfxOSWTuRmeF6"
RAZORPAY_KEY_SECRET="xnMjEKTyYhZr0EUbhkUN92oa"
ADMIN_SETUP_CODE="<one-time code from support, needed to create the admin password>"
```

Run it as a service so it stays alive. Create `/etc/systemd/system/rehab-backend.service`:
```ini
[Unit]
Description=Rehabilified FastAPI
After=network.target mongod.service

[Service]
WorkingDirectory=/opt/rehabilified/backend
EnvironmentFile=/opt/rehabilified/backend/.env
ExecStart=/opt/rehabilified/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```
Start it:
```bash
systemctl daemon-reload
systemctl enable --now rehab-backend
systemctl status rehab-backend --no-pager   # should say active (running)
```

---

## 4) Frontend (React build)
The frontend talks to the backend using `REACT_APP_BACKEND_URL`. On the VPS, both are served from the **same domain**, and Nginx forwards `/api` to the backend.

```bash
cd /opt/rehabilified/frontend
# point the app at your own domain (https):
echo 'REACT_APP_BACKEND_URL=https://YOURDOMAIN.com' > .env
yarn install
yarn build
# publish the static build
mkdir -p /var/www/rehabilified
cp -r build/* /var/www/rehabilified/
```

---

## 5) Nginx (serve site + proxy /api)
Create `/etc/nginx/sites-available/rehabilified`:
```nginx
server {
    listen 80;
    server_name YOURDOMAIN.com www.YOURDOMAIN.com;

    root /var/www/rehabilified;
    index index.html;

    # React app (HashRouter -> everything served from index.html)
    location / {
        try_files $uri /index.html;
    }

    # API -> FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable + reload:
```bash
ln -s /etc/nginx/sites-available/rehabilified /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Your site is now live on `http://YOURDOMAIN.com`.

---

## 6) Free HTTPS (SSL) — required for Razorpay
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOURDOMAIN.com -d www.YOURDOMAIN.com --redirect -m you@email.com --agree-tos -n
```
Now `https://YOURDOMAIN.com` works with auto‑renewing SSL.

---

## 7) Verify everything
```bash
curl https://YOURDOMAIN.com/api/            # -> {"message":"Hello World"}
```
- Open the site, scroll to **Career Clarity Consultation**, click **Book Now** → the real Razorpay window should open.
- Admin panel: `https://YOURDOMAIN.com/#/admin`

---

## Updating later (after code changes)
```bash
cd /opt/rehabilified && git pull
# backend:
cd backend && source venv/bin/activate && pip install -r requirements.txt && systemctl restart rehab-backend
# frontend:
cd ../frontend && yarn install && yarn build && cp -r build/* /var/www/rehabilified/
```

## Security notes
- `ADMIN_SETUP_CODE` must be set in the backend `.env` for the first admin setup. Once the admin password exists the code is no longer accepted, and only that password (or the recovery code) opens the admin panel.
- Keep `RAZORPAY_KEY_SECRET` only in `/opt/rehabilified/backend/.env` (never in the frontend).
- Set a firewall: `ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`
- MongoDB listens only on localhost by default (good). Don't expose port 27017 publicly.
