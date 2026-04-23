# SchemaFinder Submissions — Peter's Action Items

Running list of things that need to happen on your end. Updated as we build.

## Before deploying to production

### 1. Generate and store an ADMIN_TOKEN
A long random string. Used both server-side (so admin endpoints work) and in your shell when you run the admin CLI.

Generate one on the droplet:
```
ssh root@143.110.149.32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Save the value somewhere safe (password manager).

### 2. Add ADMIN_TOKEN to the running server's env

On the droplet:
```
ssh root@143.110.149.32
cd /opt/dataset-explorer
# either: pm2 set dataset-explorer:env.ADMIN_TOKEN <value>   (may or may not work cleanly)
# or cleaner: edit the PM2 startup command / ecosystem file. Easiest:
pm2 delete dataset-explorer
ADMIN_TOKEN=<your-token> pm2 start search-app/server/index.mjs --name dataset-explorer
pm2 save
```
Verify: `curl -H "Authorization: Bearer wrong" http://localhost:3001/api/admin/submissions` should return `{"error":"Unauthorized"}` (NOT `"Admin disabled"`).

### 3. Deploy the code

From your Windows box:
```
cd D:\Projects\wa-data-catalog
git add -A
git commit -m "add community submissions backend + admin cli + mcp submit tool"
git push origin main
```

Then on the droplet:
```
ssh root@143.110.149.32
cd /opt/dataset-explorer && git pull
pm2 restart dataset-explorer
pm2 logs dataset-explorer --lines 20    # verify "Community: no existing submissions" appears
```

### 4. Smoke-test in production
```
# submit a test record
curl -X POST https://schemafinder.com/api/v1/submit \
  -H "Content-Type: application/json" \
  -d '{"name":"Prod smoke test","url":"https://httpbin.org/anything/prod-test","description":"Production smoke test record to verify the community submissions endpoint is wired up and dedup is working correctly.","publisher":"Peter","domain":"technology","format":"api","access":"open","columns":[{"name":"x","type":"int"}]}'

# verify it's in search
curl "https://schemafinder.com/api/v1/search?q=prod+smoke+test&source_type=community"

# list via admin CLI (from your machine, tunneled)
ssh root@143.110.149.32 "cd /opt/dataset-explorer && ADMIN_TOKEN=<your-token> node search-app/scripts/admin.mjs list"

# reject the test record
ssh root@143.110.149.32 "cd /opt/dataset-explorer && ADMIN_TOKEN=<your-token> node search-app/scripts/admin.mjs reject c-..."
```

## Weekly digest — skipped

Peter opted out. For moderation, SSH to the droplet and run:
```
cd /opt/dataset-explorer && ADMIN_TOKEN=<token> node search-app/scripts/admin.mjs list --filter flagged
```

## Later (optional)

- [ ] Pick badge colors: I'll default to amber for community, purple for gated. Change if you want.
- [ ] Decide flag-reason enum: broken-url, duplicate, misleading, spam, offensive, other (defaults unless you say otherwise)
- [ ] Set up a real ecosystem.config.js on the droplet so env vars aren't inline in the `pm2 start` command (cleaner long-term)
