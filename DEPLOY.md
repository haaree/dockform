# FormOS Factory Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Factory LAN / WiFi                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Desktop  │  │ Tablet   │  │ Laptop   │  │ Mobile │ │
│  │ Browser  │  │ Browser  │  │ Browser  │  │ PWA    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │              │             │      │
│       └──────────────┴──────┬───────┴─────────────┘      │
│                             │                            │
│                    ┌────────▼────────┐                   │
│                    │  Ubuntu Server  │                   │
│                    │   (Docker)      │                   │
│                    │                 │                   │
│                    │  ┌───────────┐  │                   │
│                    │  │  Nginx    │  │  ← Port 80       │
│                    │  │  (web)    │  │                   │
│                    │  └─────┬─────┘  │                   │
│                    │        │ /api   │                   │
│                    │  ┌─────▼─────┐  │                   │
│                    │  │  Express  │  │  ← Port 3000     │
│                    │  │  (api)    │  │    (internal)     │
│                    │  └─────┬─────┘  │                   │
│                    │        │        │                   │
│                    │  ┌─────▼─────┐  │                   │
│                    │  │ PostgreSQL│  │  ← Port 5432     │
│                    │  │  (db)     │  │    (internal)     │
│                    │  └───────────┘  │                   │
│                    └─────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

Ubuntu Server 24.04 LTS with:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in
```

## Option A: Deploy with Internet (on server)

```bash
git clone <repo-url> formos
cd formos
cp .env.example .env
# Edit .env — change DB_PASSWORD and JWT_SECRET
docker compose up -d
# Seed database (first run only):
docker compose exec api sh -c "npx tsx prisma/seed.ts"
```

## Option B: Air-Gapped Deployment (no internet on server)

**On a machine with internet:**
```bash
cd formos
./bundle-offline.sh
# Produces: formos-offline.tar.gz
```

**Copy to factory server** (USB, SCP, etc.), then:
```bash
tar xzf formos-offline.tar.gz
cd formos
docker load -i images.tar
cp .env.example .env
# Edit .env
docker compose up -d
docker compose exec api sh -c "npx tsx prisma/seed.ts"
```

## Access

| Device | URL |
|--------|-----|
| Desktop Browser | `http://<server-ip>` |
| Tablet / Laptop | `http://<server-ip>` |
| Mobile (PWA) | `http://<server-ip>` → Add to Home Screen |

**Default admin login:** `admin@formos.local` / `admin123`

## Configuration (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `formos_secret` | PostgreSQL password |
| `JWT_SECRET` | (random string) | JWT signing key |
| `WEB_PORT` | `80` | Public-facing port |

## Management

```bash
docker compose logs -f        # View logs
docker compose down            # Stop
docker compose up -d           # Start
docker compose exec db psql -U formos  # Database shell
```

## Notes

- **No internet required** after images are built/loaded
- **PWA**: Mobile users tap "Add to Home Screen" for app-like experience
- **Data persistence**: PostgreSQL data stored in Docker volume `pgdata`
- **Backup**: `docker compose exec db pg_dump -U formos formos > backup.sql`
- **Restore**: `cat backup.sql | docker compose exec -T db psql -U formos formos`
