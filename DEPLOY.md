# Deployment Guide

## Architecture

The app is a single Express server that:
- Serves the React frontend (static build from `client/dist/`)
- Serves the search API (loads embeddings + metadata into memory)
- Requires ~800MB RAM (300MB embeddings + 200MB metadata + overhead)

No GPU, no Ollama, no external APIs needed. The embedding model (`all-MiniLM-L6-v2`) downloads automatically on first start.

## Option A: Railway (recommended)

Railway connects directly to GitHub and auto-deploys. The data files need to be in the repo or uploaded separately.

### Steps

1. **Build the frontend:**
   ```bash
   cd search-app/client && npm install && npm run build
   ```

2. **Ensure data files exist:**
   - `search-app/data/embeddings.bin` (~300MB for MiniLM 384-dim)
   - `search-app/data/metadata.jsonl`
   - `search-app/data/index-info.json`
   - `search-app/data/dedup-metadata.json`
   - `schemas/final/*.jsonl` (for dataset detail pages)

3. **Create Railway project:**
   - Go to railway.app, connect GitHub repo
   - Railway will detect the Dockerfile and build
   - Set environment variable: `PORT=3001`
   - The first deploy will download the MiniLM model (~80MB, cached after)

4. **Custom domain:**
   - In Railway project settings → Networking → Custom Domain
   - Add your domain, Railway gives you a CNAME target
   - Set DNS: CNAME record pointing to Railway's target

### Data files too large for Git?

If the data files are too large for the Git repo, use Railway volumes:
1. Deploy without data first
2. SSH into the Railway container
3. Upload data files via `railway run` or a persistent volume

OR use the alternative approach: host data files on a CDN/S3 bucket and download them on container start.

## Option B: DigitalOcean Droplet ($6/mo)

For more control:

```bash
# On the droplet
git clone https://github.com/peter-products/dataset-explorer.git
cd dataset-explorer

# Upload data files (from local machine)
scp -r search-app/data/ user@droplet-ip:~/dataset-explorer/search-app/data/
scp -r schemas/final/ user@droplet-ip:~/dataset-explorer/schemas/final/

# Build frontend
cd search-app/client && npm install && npm run build && cd ../..

# Install server deps
cd search-app/server && npm install && cd ../..
cd search-app && npm install && cd ..

# Start with PM2
npm install -g pm2
cd search-app/server
PORT=3001 pm2 start index.mjs --name dataset-explorer

# Reverse proxy with Caddy (auto-HTTPS)
sudo apt install caddy
echo 'yourdomain.com { reverse_proxy localhost:3001 }' | sudo tee /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

## Option C: Render

Similar to Railway:
1. Connect GitHub repo
2. Set build command: `cd search-app/client && npm install && npm run build`
3. Set start command: `cd search-app/server && node index.mjs`
4. Set environment: `PORT=3001`
5. Upload data via Render disk or include in repo

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| PORT | 3001 | Server port |

## Health Check

```bash
curl https://yourdomain.com/api/health
# {"status":"ok","records":197734,"model":"loaded"}
```

## Memory Requirements

- **Minimum:** 1GB RAM (tight but works)
- **Recommended:** 2GB RAM (comfortable headroom)
- Disk: ~2GB (data files + model cache + app code)