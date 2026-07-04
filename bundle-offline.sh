#!/bin/bash
# Build Docker images and export as a tarball for air-gapped factory deployment.
#
# Run this on a machine WITH internet access:
#   ./bundle-offline.sh
#
# Then copy formos-offline.tar.gz to the factory server and run:
#   tar xzf formos-offline.tar.gz
#   cd formos
#   docker load -i images.tar
#   cp .env.example .env
#   docker compose up -d
#   docker compose exec api sh -c "npx tsx prisma/seed.ts"

set -euo pipefail

echo "=== Building FormOS Docker images ==="
docker compose build

echo "=== Saving images to tarball ==="
docker save $(docker compose config --images) -o images.tar

echo "=== Creating offline bundle ==="
tar czf formos-offline.tar.gz \
  docker-compose.yml \
  .env.example \
  deploy.sh \
  images.tar

rm images.tar
echo ""
echo "Done! Ship formos-offline.tar.gz to your factory server."
echo "Size: $(du -h formos-offline.tar.gz | cut -f1)"
