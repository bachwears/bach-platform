# Deploy — Shared VPS / edge proxy

Since 2026-09-30 the Hostinger VPS is shared with an unrelated project
(TawreedHR, tawreedhr.com). Ports 80/443 belong to a neutral edge proxy,
not to bach (PR #1, merge `d833ef9`):

- Edge proxy: `/srv/edge`, compose project `edge`, container `edge-caddy-1`
  (caddy:2-alpine). Its `/srv/edge/Caddyfile` only does `import sites/*.caddy`;
  each project owns one site file — bach's is `/srv/edge/sites/bach.caddy`.
- The edge container joins the external `bach` network to reach
  storefront/pos/mgmt by service name (and TawreedHR's `tawreedhr_edge`
  network for that project). The two projects never join each other's
  networks.
- CI ships this repo's `deploy/Caddyfile` to `/srv/edge/sites/bach.caddy`,
  then runs `caddy validate` + `caddy reload` inside the edge container
  (no downtime). The health check curls `http://localhost/`, answered by
  the edge.

## Rules

1. Never add a Caddy/nginx/Traefik service or publish ports 80/443 in
   `deploy/docker-compose.yml` — it conflicts with the edge proxy and
   breaks the deploy.
2. All bach routing changes (new subdomain, headers, redirects) go in
   `deploy/Caddyfile` in this repo. It is still bach's own file; CI ships
   and reloads it. Keep it valid Caddyfile syntax — the deploy validates
   before reloading.
3. A new bach subdomain needs DNS pointed at the VPS first; the edge
   obtains certificates automatically.
4. Never touch `/srv/tawreedhr`, the `tawreedhr` compose project, its
   networks (`tawreedhr_internal`, `tawreedhr_edge`), its volume
   (`tawreedhr_pgdata`) or `/srv/edge/sites/tawreedhr.caddy`. Bach CI must
   not edit `/srv/edge/Caddyfile` or `/srv/edge/compose.yaml`.
5. Keep commands scoped to the bach compose project. No host-wide
   `docker system|volume|network prune`, daemon restarts or server reboots
   without coordinating — they take TawreedHR down too. (The existing
   `docker image prune -f` in deploy.yml only removes dangling images and
   is fine.)
6. TawreedHR containers carry memory/CPU limits; if bach needs more
   resources, check `docker stats` first.
7. `docker compose down` for bach can fail to remove the `bach` network
   while the edge is attached — expected. Prefer `docker compose up -d`
   or restarting individual services.

## Host notes

- deploy's crontab has two independent backup jobs: 03:15 bach
  (`/srv/bach/backup/run.sh`) and 03:45 TawreedHR. Don't remove the
  TawreedHR line.
- A host reboot interrupts both projects — plan it deliberately.

## Emergency (edge proxy itself down)

```
docker logs edge-caddy-1 --tail 50
docker compose -f /srv/edge/compose.yaml ps
docker compose -f /srv/edge/compose.yaml restart caddy
```

Bach's old self-hosted Caddy setup is gone from this repo; restoring it
means reverting PR #1 AND stopping the edge proxy, which takes
tawreedhr.com offline — coordinate with the TawreedHR side first.
