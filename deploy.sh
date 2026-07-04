#!/bin/bash
# FormOS Factory Deployment Script
# Run on Ubuntu Server 24 LTS with Docker and Docker Compose installed.
#
# Usage:
#   1. Copy the entire formos/ directory to the server
#   2. cd formos
#   3. cp .env.example .env   (edit secrets)
#   4. ./deploy.sh
#
# After deployment:
#   - Access from any browser on the factory LAN: http://<server-ip>
#   - Default admin login: admin@formos.local / admin123
#   - Mobile: open the same URL on phone/tablet, tap "Add to Home Screen" for PWA

set -euo pipefail

echo "=== FormOS Factory Deployment ==="

# Check prerequisites
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed."
  echo "Install: sudo apt update && sudo apt install -y docker.io docker-compose-plugin"
  exit 1
fi

# Load .env if exists
if [ ! -f .env ]; then
  echo "Creating .env from template..."
  cp .env.example .env
fi

echo "Building containers (this may take a few minutes on first run)..."
docker compose build

echo "Starting services..."
docker compose up -d

echo "Waiting for database to be ready..."
sleep 5

echo "Running database seed..."
docker compose exec api sh -c "npx tsx prisma/seed.ts" 2>/dev/null || echo "Seed may have already been applied."

echo ""
echo "=== FormOS is running! ==="
echo ""
echo "  Web UI:  http://$(hostname -I | awk '{print $1}')"
echo "  Login:   admin@formos.local / admin123"
echo ""
echo "  Mobile:  Open the same URL on phone/tablet via factory WiFi"
echo "           Tap 'Add to Home Screen' for PWA install"
echo ""
echo "  Manage:  docker compose logs -f    (view logs)"
echo "           docker compose down       (stop)"
echo "           docker compose up -d      (start)"
