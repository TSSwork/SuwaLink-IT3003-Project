# Deploying and running SuwaLink

This guide takes you from an empty server to a running SuwaLink site, and then covers updates,
backups and day-to-day care. You do not need to know Java or JavaScript: every step is a command you
can copy and paste. Run the commands in a terminal on the server (for example over SSH), one block
at a time, and read the line after each block that says what you should see.

The whole site runs as four containers, started together by Docker Compose from `docker-compose.yml`:

| Service | What it is | Reachable from |
|---|---|---|
| `web` | Caddy: serves the web app, forwards `/api` to the backend, handles HTTPS | the internet (ports 80 and 443) |
| `backend` | The SuwaLink API (Spring Boot) | the other containers only |
| `db` | MySQL 8.4, holding all data | the other containers only |
| `mailpit` | A fake mail inbox, for showcases only (started with `--profile demo`) | this machine only (`127.0.0.1:8025`) |

Data lives in Docker volumes, so it survives restarts, rebuilds and updates: `suwalink-prod_db_data`
(the database), `suwalink-prod_uploads` (prescription photos) and two Caddy volumes (certificates).

For local development, use `docker-compose.dev.yml` instead (see the main [README](../README.md)). The
two files are separate Compose projects, `suwalink` (dev) and `suwalink-prod` (this guide), so they
never share containers or data, even on the same machine.

---

## 1. Requirements

- **A server (VPS)** with at least 2 GB RAM, 2 vCPU and 20 GB disk, running a recent Linux such as
  Ubuntu 24.04 LTS. Building the images on a server with less memory may fail.
- **Docker Engine with the Compose v2 plugin.** Check with `docker compose version` (note: a space, not
  `docker-compose`). To install it on Ubuntu or Debian:

  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"      # then log out and back in, so you can run docker without sudo
  ```

- **git**, **openssl**, and **python3** or **jq** (the backup script needs one of the last two).
  Ubuntu ships python3 already. To be sure: `sudo apt-get install -y git openssl python3`.
- **Ports 80 and 443 open** to the internet. If the server uses the `ufw` firewall:

  ```bash
  sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
  ```

  Also open them in your hosting provider's firewall or security group, if it has one.
- **Optional: a domain name** (for example `suwalink.example.lk`) with a DNS **A record** pointing at
  the server's public IP address. Without one the site still works over plain HTTP on the IP address,
  with the limits explained in [section 4](#4-https-and-domains).

---

## 2. First-time setup

### 2.1 Get the code

```bash
sudo mkdir -p /opt/suwalink && sudo chown "$USER": /opt/suwalink
git clone https://github.com/TSSwork/SuwaLink-IT3003-Project.git /opt/suwalink
cd /opt/suwalink
```

Every later command in this guide is run from `/opt/suwalink`.

### 2.2 Create the settings file `.env`

```bash
cp .env.example .env
chmod 600 .env
```

`.env` holds every password the site uses. It is never committed to git, and `chmod 600` makes it
readable by your user only. Each setting in it has a comment explaining it.

Fill in the four secrets with random values (copy and paste this whole block as is):

```bash
sed -i \
  -e "s|^MYSQL_PASSWORD=.*|MYSQL_PASSWORD=$(openssl rand -hex 24)|" \
  -e "s|^MYSQL_ROOT_PASSWORD=.*|MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" \
  .env
grep -E '^(MYSQL_PASSWORD|MYSQL_ROOT_PASSWORD|JWT_SECRET)=.{24,}' .env | cut -d= -f1
```

You should see the three names, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` and `JWT_SECRET`, which means
each now has a long random value. You never need to type these values anywhere; the containers read
them from `.env`.

Now open the file to set the rest:

```bash
nano .env
```

(In nano: move with the arrow keys, save with `Ctrl+O` then `Enter`, quit with `Ctrl+X`.)

Set at least these:

| Setting | What to put |
|---|---|
| `SITE_ADDRESS` | Your domain, e.g. `suwalink.example.lk` (no `http://`), for automatic HTTPS. With no domain, `http://` plus the server's IP, e.g. `http://203.0.113.10`. Keep `http://localhost` only on your own computer. |
| `ADMIN_EMAIL` | The email address you will sign in with as administrator. |
| `ADMIN_PASSWORD` | Its first password, **at least 12 characters**. Use letters, digits and `-_.!@%`; avoid spaces and `$ # ' " \`, which `.env` treats specially. You will change it after the first sign-in. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | Your outgoing mail (SMTP) provider, used for password-reset codes and notifications. Port `587` with `MAIL_SMTP_AUTH=true` and `MAIL_SMTP_STARTTLS=true` suits most providers. For a showcase without real mail, see [section 3](#3-showcase-on-localhost). |
| `MAIL_FROM` | The sender address on outgoing mail. Your provider may require one of your own addresses. |

Leave `HTTP_PORT=80` and `HTTPS_PORT=443` as they are on a normal server. Everything else has a
working default.

If a required setting is empty, `docker compose up` refuses to start anything and names it, for
example:

```
required variable JWT_SECRET is missing a value: set JWT_SECRET in .env (openssl rand -base64 48)
```

Fix `.env` and run the command again.

### 2.3 Build and start

```bash
docker compose up -d --build
```

The first run downloads base images and builds the backend and the web app. That takes 5–15 minutes,
depending on the server. The command then waits until the database and backend are healthy before
it starts `web`, and returns. You should finish with lines like `Container suwalink-prod-web-1 Started`.

### 2.4 Check it started

```bash
docker compose ps
```

All three services, `db`, `backend` and `web`, should show `Up … (healthy)`. Right after the
first start, `backend` may show `(health: starting)` for up to two minutes while it creates the
database tables. (Some setups, such as podman, show only `Up` there; this command shows the health of
each container everywhere, and every line should end in `healthy`:)

```bash
docker compose ps -q | xargs docker inspect -f '{{.Name}} {{.State.Health.Status}}'
```

To watch the backend start:

```bash
docker compose logs -f backend
```

Wait for a line containing `Started SuwaLinkApplication`, followed on the first start by
`Bootstrap admin created:` with your admin email. Press `Ctrl+C` to stop watching (the site keeps
running). If you see an error instead, go to [section 8](#8-troubleshooting).

### 2.5 Open the site and sign in

Open your `SITE_ADDRESS` in a browser, e.g. `https://suwalink.example.lk` or `http://203.0.113.10`.
With a domain, the first visit can take a few seconds while Caddy gets the certificate.

Click **Sign in** and use `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`. Then **change the admin
password** right away. There is no "change password" page for the admin yet, so use the reset flow:
sign out, click **Forgot your password?** on the sign-in page, enter `ADMIN_EMAIL`, and use the
6-digit code that arrives by email (in a showcase, in Mailpit). This also proves outgoing mail works.

The `ADMIN_*` values are used only to create the first admin when the database has none; changing them
in `.env` later has no effect. `ADMIN_PASSWORD` must stay filled in (compose requires it), but once
you have reset the password, the value in `.env` no longer signs anyone in.

Optional self-test, from the server: `scripts/smoke.sh` checks the home page, deep links, the API,
admin sign-in and the rate limiter. Pass it your site address and the admin login (as typed in
`.env`; use the current password if you have changed it):

```bash
ADMIN_EMAIL='you@example.com' ADMIN_PASSWORD='the-admin-password' scripts/smoke.sh https://suwalink.example.lk
```

It ends with `RESULT: all smoke checks passed`. **Note:** its last checks use up the login limit for
the server's own IP address on purpose, so for about 5 minutes logins coming from the server itself
are refused with "too many attempts". Visitors from other addresses are not affected. To run it again
sooner, restart the backend first (`docker compose restart backend`), which clears the limit.

---

## 3. Showcase on localhost

To present SuwaLink from your own laptop, with demo pharmacies and customers and no real mail, run
the same stack with a built-in fake mail inbox, Mailpit.

1. Do steps [2.1](#21-get-the-code)–[2.2](#22-create-the-settings-file-env), cloning to any folder. In
   `.env`, keep `SITE_ADDRESS=http://localhost`, set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and set the
   mail settings to Mailpit:

   ```
   MAIL_HOST=mailpit
   MAIL_PORT=1025
   MAIL_SMTP_AUTH=false
   MAIL_SMTP_STARTTLS=false
   COMPOSE_PROFILES=demo
   ```

   `COMPOSE_PROFILES=demo` makes every `docker compose` command include the `mailpit` service, so
   you do not need to type `--profile demo` each time. (The equivalent one-off form is
   `docker compose --profile demo up -d --build`.)

2. Start it: `docker compose up -d --build`, and check with `docker compose ps` as in
   [2.4](#24-check-it-started). There are now four services.
3. Open `http://localhost`. Every email the site sends (sign-up codes, password resets,
   notifications) appears in the Mailpit inbox at `http://localhost:8025`. If port 8025 is already in
   use on your laptop, set `MAILPIT_UI_PORT=18025` (or another free port) in `.env` and run
   `docker compose up -d` again.
4. Sign in as the admin, go to **Admin → Settings**, and turn on **Show demo data publicly**. The
   demo pharmacies now appear in search, and the login page shows one-click demo sign-in buttons.
   All demo accounts use the password `DemoPass123!`; the full list is in
   [`DEMO_USERS.md`](DEMO_USERS.md). While demo mode is off, demo accounts cannot sign in.
5. **Before every presentation**, press **Reset demo data** on the same page. It replaces everything
   the demo accounts have done with a fresh copy. This matters because the seeded prescription
   requests expire 7 days after they were seeded, after which the customer journey has nothing to
   show. Real (non-demo) data is not touched by the reset.

The demo data is created on the first start (`DEMO_SEED_ENABLED=true`, the default) and stays hidden
until an admin turns demo mode on, so leaving it seeded on a real server is harmless. Set
`DEMO_SEED_ENABLED=false` before the first start if you never want it.

On Linux with **rootless podman** instead of Docker (e.g. Fedora), see
[Rootless podman](#rootless-podman) in section 8.

---

## 4. HTTPS and domains

- **With a domain:** set `SITE_ADDRESS=suwalink.example.lk` in `.env` (DNS A record pointing at the
  server, ports 80 and 443 open) and run `docker compose up -d`. Caddy then gets a free certificate
  from Let's Encrypt on its own, renews it automatically, and redirects HTTP to HTTPS. Certificates
  are kept in the `caddy_data` volume. If the certificate is not issued, check
  `docker compose logs web`: the usual causes are DNS not pointing at the server yet, or port 80
  blocked by a firewall.
- **With only an IP address** (`SITE_ADDRESS=http://203.0.113.10`) there is no HTTPS. Everything works
  except one thing: browsers allow the camera only on HTTPS pages (or `localhost`), so pharmacies
  cannot scan a customer's QR code **inside the app**. Two workarounds still work: type the code shown
  under the QR code by hand, or scan the QR code with the phone's own camera app, which opens the
  link the QR code contains.
- **Changing the address later:** edit `SITE_ADDRESS` and run `docker compose up -d`. Links in emails
  and the browser origin the backend accepts follow `SITE_ADDRESS` automatically.

---

## 5. Updating

Take a backup first ([section 6](#6-backups-and-restore)), then:

```bash
cd /opt/suwalink
./scripts/backup.sh
git pull && docker compose up -d --build
```

Database changes (Liquibase migrations) run automatically when the new backend starts. Data in the
volumes is kept. Check with `docker compose ps` as in [2.4](#24-check-it-started). The site is
unavailable for a minute or two while the backend restarts.

If `git pull` brings a new `.env.example` setting you want, copy that line into your `.env`;
existing settings keep working. Only the variables listed under `backend:` → `environment:` in
`docker-compose.yml` reach the backend. To tune any other backend setting, add a line there, e.g.
`APP_PRESCRIPTION_EXPIRY_DAYS: ${APP_PRESCRIPTION_EXPIRY_DAYS:-7}` (Spring reads
`app.prescription.expiry-days` from `APP_PRESCRIPTION_EXPIRY_DAYS`), and put the value in `.env`.
Keep such local edits small: `git pull` may need you to merge them.

---

## 6. Backups and restore

### What is backed up

`scripts/backup.sh` writes two files into `backups/` (inside `/opt/suwalink`, never committed to git):

- `db-YYYYmmdd-HHMMSS.sql.gz`: the whole database
- `uploads-YYYYmmdd-HHMMSS.tar.gz`: all uploaded prescription photos

It then deletes backups older than `BACKUP_KEEP_DAYS` days (14 by default; both settings are in
`.env`). The stack must be running. The script prints one line such as
`backup ok 2026-10-30 02:30:01 db=db-20261030-023001.sql.gz (1.2M) uploads=… pruned=0 keep_days=14`.

Run one now to check it works:

```bash
cd /opt/suwalink
./scripts/backup.sh
ls -lh backups/
```

The first run downloads the small `alpine:3.20` image the script uses to read the photos volume. On a
server without internet access, download it beforehand with `docker pull docker.io/library/alpine:3.20`.

### Nightly backups with cron

```bash
mkdir -p /opt/suwalink/backups
crontab -e
```

(`mkdir` is needed once, because cron opens the log file before the script runs.) Add this line at
the end, save and quit; it backs up every night at 02:30 server time:

```
30 2 * * * cd /opt/suwalink && ./scripts/backup.sh >> backups/backup.log 2>&1
```

The cron job runs as your user, who must be able to run `docker` (the `docker` group from
[section 1](#1-requirements)). Check `backups/backup.log` the next morning for a `backup ok` line.

### Keep a copy off the server

A backup on the same disk is lost with the server. Copy `backups/` somewhere else regularly, for
example to another machine with `rsync` (run it from that machine, or add it to cron after the
backup):

```bash
rsync -a user@your-server:/opt/suwalink/backups/ ~/suwalink-backups/
```

The backup files contain all user data, including password hashes and prescription photos: store them
somewhere private.

### Restore

A restore **replaces** the whole database and all photos with the ones from the backup. Anything
created after that backup is lost, so take a fresh backup first in case you need to go back:

```bash
cd /opt/suwalink
./scripts/backup.sh
ls backups/                       # pick the pair (same date and time) you want to restore
./scripts/restore.sh backups/db-20261030-023000.sql.gz backups/uploads-20261030-023000.tar.gz
```

The script first checks both files are complete and readable, and stops without changing anything if
they are not. It then asks you to type `yes`, stops the backend, loads the database and photos,
starts the backend again and waits until it is healthy (a few minutes). It ends with `restore: done`.

**Restoring onto a new server:** do the whole [first-time setup](#2-first-time-setup) there first
(a new `.env` is fine; the admin and other accounts come back from the backup), copy the two backup
files over, and run `restore.sh` as above.

### The restore drill

Backups you have never restored are a hope, not a plan. `scripts/test-backup-restore.sh` rehearses
the whole cycle on a separate throwaway copy of the stack: it starts it (ports 8088/8443), creates a
test customer with a photo, backs up, deletes everything, restores, checks the customer and photo
came back, and cleans up. It does not touch the real site's data, but it builds and runs a second
stack, so run it at a quiet time:

```bash
cd /opt/suwalink
./scripts/test-backup-restore.sh
```

It needs `curl`, `openssl` and `python3`, free ports 8088, 8443 and 18025, and takes about 5–10
minutes. It ends with `RESULT: backup/restore drill passed`, or names the step that failed. Doing it once after setup, and after big updates, is a good habit.

---

## 7. Operations

All commands are run from `/opt/suwalink`.

| Task | Command |
|---|---|
| Status of every service | `docker compose ps` |
| Health of every container | `docker compose ps -q \| xargs docker inspect -f '{{.Name}} {{.State.Health.Status}}'` |
| Follow the backend log | `docker compose logs -f backend` (`Ctrl+C` to stop watching) |
| Last 200 lines of every log | `docker compose logs --tail 200` |
| Logs of the web server (requests, certificates) | `docker compose logs web` |
| Restart one service | `docker compose restart backend` (or `web`, `db`) |
| Stop everything (data is kept) | `docker compose down` |
| Start again | `docker compose up -d` |
| Disk usage of images and volumes | `docker system df -v` and `df -h /` |
| Free space from old images after updates | `docker image prune -f` |

Logs are rotated automatically (3 files of 10 MB per service), so they do not fill the disk.

**Never add `-v` to `docker compose down`** on the real server: `down -v` deletes the volumes, which
means the whole database and every photo.

**After editing `.env`**, run `docker compose up -d`, not `restart`: only `up` recreates containers with
the new settings.

### Rotating `JWT_SECRET`

`JWT_SECRET` signs every sign-in session. Change it if it may have leaked; doing so **signs everyone
out**, and users simply sign in again.

```bash
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" .env
docker compose up -d
```

### Changing database passwords

`MYSQL_*` values in `.env` are applied only when the database volume is first created. Changing them
afterwards breaks the backend's connection to the database. Leave them as generated.

---

## 8. Troubleshooting

Start with `docker compose ps` to see which service is unhealthy, then read its log.

### `docker compose` refuses to run: "required variable … is missing a value"

A required setting in `.env` is empty or missing; the message names it. This blocks `up`, `build` and
`config` (and, with some Compose versions, other commands such as `down` too). Fill it in ([2.2](#22-create-the-settings-file-env)) and
run the command again.

### The backend will not start, or keeps restarting

`docker compose ps` shows `backend` as `Restarting`, `unhealthy` or `health: starting` for more than
3 minutes. The reason is in its log; this shows the most useful line:

```bash
docker compose logs backend | grep -m1 "Caused by"
docker compose logs --tail 100 backend
```

Common causes:

- **`JWT_SECRET must be at least 32 bytes`**: the secret is too short. Generate one as in
  [Rotating `JWT_SECRET`](#rotating-jwt_secret).
- **`ADMIN_PASSWORD must be at least 12 characters`**: on the first start only; use a longer one.
- **`Cannot add uk_inventory_pharmacy_medicine: inventory has more than one row …`**: only when
  updating a database created by an older version. A migration now allows one stock line per medicine
  per pharmacy and refuses to run while duplicates exist, so nothing is deleted. The message says what
  to merge or delete. Fix the data (or ask a developer to), then `docker compose restart backend`.
- **`Communications link failure` or `Access denied for user`**: the backend cannot reach or sign in
  to the database. Check `docker compose ps db` is `healthy` and `docker compose logs db`. "Access
  denied" usually means the `MYSQL_*` values were changed after the database was created (see
  [Changing database passwords](#changing-database-passwords)): put the old values back.

### The database is not healthy

`docker compose logs db`. The first start of a new database takes up to a minute. If the disk is full
(`df -h /`), free space (`docker image prune -f`, old files in `backups/`) and run
`docker compose up -d`.

### The site shows "502 Bad Gateway"

Caddy is running but cannot reach the backend, usually because the backend is restarting (for
example right after an update). Wait two minutes and reload. If it persists, check the backend as
above.

### The site does not load at all

- `docker compose ps web` must be `healthy`; else `docker compose logs web`.
- Ports 80/443 must be open in the server firewall and your provider's firewall
  ([section 1](#1-requirements)).
- With a domain, DNS must point at this server: `getent hosts suwalink.example.lk`.
- Another program (e.g. Apache or nginx) may already use port 80: `sudo ss -ltnp | grep ':80 '`.

### Emails are not arriving

Mail problems do not make the backend "unhealthy" (on purpose, so an outage of your mail provider
does not take the site down), so look in the log:

```bash
docker compose logs backend | grep -i -E "mail|smtp" | tail -20
```

`AuthenticationFailedException` means a wrong `MAIL_USERNAME`/`MAIL_PASSWORD`; a connection timeout
means a wrong `MAIL_HOST`/`MAIL_PORT` or a provider that blocks the port. Also check the recipient's
spam folder. After fixing `.env`, run `docker compose up -d`. Note that demo accounts never receive
real mail: their mail goes to `DEMO_MAIL_REDIRECT`, or nowhere if that is empty.

### Demo accounts cannot sign in

They show "Demo accounts are currently turned off": demo mode is off. Turn on **Admin → Settings →
Show demo data publicly** ([section 3](#3-showcase-on-localhost)). If the demo accounts do not exist
at all, `DEMO_SEED_ENABLED` was `false` at start-up: set it to `true`, `docker compose up -d`, or press
**Reset demo data**.

### "Too many attempts" when signing in

Five failed attempts for one email, or ten from one address, lock logins for 5 minutes. Wait, or
clear the limit at once with `docker compose restart backend`. Running `scripts/smoke.sh` causes this
on purpose ([2.5](#25-open-the-site-and-sign-in)).

### Rootless podman

On a machine with rootless podman instead of Docker (e.g. Fedora), the same commands work with Docker
Compose pointed at podman's socket:

```bash
systemctl --user enable --now podman.socket
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
```

Rootless containers cannot use ports below 1024. Either allow them once
(`sudo sysctl net.ipv4.ip_unprivileged_port_start=80`; add it to `/etc/sysctl.d/` to keep it), or set
other ports in `.env`, e.g. `HTTP_PORT=8088` and `HTTPS_PORT=8443`, and open
`http://localhost:8088`. Keep `SITE_ADDRESS=http://localhost` (Caddy listens inside the container on
port 80 whatever the host port is), and add the real address so links in emails include the port:

```
FRONTEND_BASE_URL=http://localhost:8088
CORS_ALLOWED_ORIGINS=http://localhost:8088
```

---

## 9. Security notes

- **The backend and database are never published** to the internet. Caddy (`web`) is the only way in,
  and it replaces any client-supplied forwarding headers, so nobody can fake their IP address to get
  around the login limits. Do not add `ports:` to `backend` or `db` in `docker-compose.yml`.
- **Change the admin password after the first sign-in** (with **Forgot your password?**, see
  [2.5](#25-open-the-site-and-sign-in)). The one in `.env` is stored in plain text.
- **Keep `.env` at mode 600** (`chmod 600 .env`; check with `ls -l .env`, which should start with
  `-rw-------`). Never commit it, email it or paste it into chat. The same care applies to the
  `backups/` folder, which the backup script keeps at mode 700.
- **Revoke the old Gmail app password.** An early version of this repository committed a Gmail app
  password, and it is still in the git history even though the current files do not contain it. If
  that Google account is still in use, revoke the app password at
  <https://myaccount.google.com/apppasswords> and create a new one if needed. Never reuse it.
- **Content Security Policy is a follow-up.** Caddy already sends `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` headers, but no CSP yet: the map tiles
  and inline styles need a tested policy first.
- Keep the server itself updated (`sudo apt-get update && sudo apt-get upgrade`), and pull SuwaLink
  updates regularly ([section 5](#5-updating)).
