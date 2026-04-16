#!/bin/bash
# Safe deploy with schema check, backup, and post-deploy smoke test.
# Usage: bash deploy.sh [--data|--code|--both]
#   --data   upload metadata.jsonl + embeddings.bin + index-info.json
#   --code   git pull + build on droplet
#   --both   do both (default)

set -e

MODE="${1:---both}"
REMOTE="root@143.110.149.32"
REMOTE_DIR="/opt/dataset-explorer/search-app/data"
LOCAL_DATA="D:/Projects/wa-data-catalog/search-app/data"
SITE="https://schemafinder.com"

cd "$(dirname "$0")"

echo "=== PRE-DEPLOY CHECKS ==="

if [[ "$MODE" == "--data" || "$MODE" == "--both" ]]; then
  [ -f "$LOCAL_DATA/metadata.jsonl" ] || { echo "Missing metadata.jsonl"; exit 1; }
  [ -f "$LOCAL_DATA/embeddings.bin" ] || { echo "Missing embeddings.bin"; exit 1; }
  [ -f "$LOCAL_DATA/index-info.json" ] || { echo "Missing index-info.json"; exit 1; }

  echo "-- Field parity check (local vs current prod)"
  local_keys=$(head -1 "$LOCAL_DATA/metadata.jsonl" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(Object.keys(r).sort().join(','))")
  remote_keys=$(ssh "$REMOTE" "head -1 $REMOTE_DIR/metadata.jsonl | node -e \"const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(Object.keys(r).sort().join(','))\"" 2>/dev/null || echo "UNREACHABLE")
  if [ "$local_keys" != "$remote_keys" ]; then
    echo "WARN: metadata keys differ from prod"
    echo "  local:  $local_keys"
    echo "  remote: $remote_keys"
    read -p "Continue anyway? (y/N) " ans
    [ "$ans" = "y" ] || { echo "Aborted."; exit 1; }
  else
    echo "  OK -- fields match"
  fi

  echo "-- Required-field check"
  head -1 "$LOCAL_DATA/metadata.jsonl" | node -e "
    const r = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const missing = [];
    if (!r.columns) missing.push('columns');
    if (!r.id) missing.push('id');
    if (!r.name) missing.push('name');
    if (missing.length) { console.error('FAIL: missing required fields:', missing.join(',')); process.exit(1); }
    console.log('  OK -- required fields present');
  "

  echo "-- Sizes"
  ls -lh "$LOCAL_DATA/metadata.jsonl" "$LOCAL_DATA/embeddings.bin" | awk '{print "  "$NF": "$5}'
fi

echo ""
echo "=== BACKUP PROD ==="
ssh "$REMOTE" "cd $REMOTE_DIR && cp metadata.jsonl metadata.jsonl.last-good 2>/dev/null; cp embeddings.bin embeddings.bin.last-good 2>/dev/null; cp index-info.json index-info.json.last-good 2>/dev/null; true"
echo "  OK"

echo ""
echo "=== UPLOAD ==="
if [[ "$MODE" == "--data" || "$MODE" == "--both" ]]; then
  scp "$LOCAL_DATA/metadata.jsonl" "$LOCAL_DATA/embeddings.bin" "$LOCAL_DATA/index-info.json" "$REMOTE:$REMOTE_DIR/"
fi

if [[ "$MODE" == "--code" || "$MODE" == "--both" ]]; then
  ssh "$REMOTE" "cd /opt/dataset-explorer && git pull && cd search-app/client && npm run build"
fi

echo ""
echo "=== RESTART ==="
ssh "$REMOTE" "pm2 restart dataset-explorer"

echo ""
echo "=== SMOKE TEST ==="
sleep 5
for i in 1 2 3 4 5; do
  resp=$(curl -s "$SITE/api/search?q=health&limit=1")
  count=$(echo "$resp" | node -e "try{const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.count||0)}catch{console.log(0)}")
  if [ "$count" -gt 0 ]; then
    echo "  OK -- /api/search returned $count result(s)"
    break
  fi
  echo "  attempt $i: count=$count, retrying in 3s..."
  sleep 3
  if [ $i -eq 5 ]; then
    echo ""
    echo "FAIL -- smoke test failed after 5 attempts"
    echo "Response: $resp"
    read -p "Revert to last-good? (Y/n) " ans
    if [ "$ans" != "n" ]; then
      ssh "$REMOTE" "cd $REMOTE_DIR && mv metadata.jsonl.last-good metadata.jsonl && mv embeddings.bin.last-good embeddings.bin && mv index-info.json.last-good index-info.json && pm2 restart dataset-explorer"
      echo "Reverted. Investigate locally before redeploying."
    fi
    exit 1
  fi
done

echo ""
echo "=== DONE ==="
echo "Live at $SITE"
