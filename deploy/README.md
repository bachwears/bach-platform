# Deploy — shared VPS, fully separated projects

The Hostinger VPS also hosts an unrelated project (TawreedHR, tawreedhr.com). The two
projects share only the machine and its single public IPv4 address:

| | Bach | TawreedHR |
|---|---|---|
| Linux user / SSH key | `deploy` (this CI's key) | `tawreedhr` (own key, no sudo) |
| Directory | `/srv/bach` | `/srv/tawreedhr` (mode 700, not readable by `deploy`) |
| Crontab | `deploy`'s (03:15 bach backup) | `tawreedhr`'s (03:45) |
| TLS proxy + certificates | own Caddy service `caddy`, `/srv/bach/caddy/data` | own Caddy, `/srv/tawreedhr/caddy/data` |
| Loopback ports | `127.0.0.1:9080` / `9443` | `127.0.0.1:8080` / `8443` |
| Docker networks | `bach` | `tawreedhr_internal`, `tawreedhr_edge` |

Ports 80/443 belong to a **neutral edge router**: `/srv/edge`, compose project `edge`,
container `edge-haproxy-1` (HAProxy, host networking, owned by root). It terminates nothing
and holds no certificates: HTTPS is passed through by SNI and port 80 by Host header to each
project's loopback ports, with the PROXY protocol (v2) carrying the client address. It joins
no project network. Bach's Caddy reads the PROXY header (`listener_wrappers` in
`deploy/Caddyfile`), so `{remote_host}` is the real visitor.

CI ships `deploy/docker-compose.yml` and `deploy/Caddyfile` to `/srv/bach`, validates the
Caddyfile, runs `docker compose up -d` and reloads bach's Caddy (no downtime). The health
check requests `https://bachwears.com/` through the edge router on the VPS.

## Rules

1. All bach routing changes (subdomains, headers, redirects) go in `deploy/Caddyfile`. Keep
   the global `servers` block and the explicit `http://…` site: without them bach's Caddy
   cannot read the PROXY header and requests fail with 400.
2. A **new bach hostname** needs DNS pointed at the VPS **and** a one-line addition to the
   edge router's SNI/Host lists in `/srv/edge/haproxy.cfg` (root-owned, changed by the
   server admin, not by CI). Bach's Caddy then obtains the certificate itself.
3. Never publish ports 80/443 from the bach compose file; keep bach's Caddy on
   `127.0.0.1:9080/9443`.
4. Bach CI never touches `/srv/edge`, `/srv/tawreedhr`, the `tawreedhr` compose project, its
   networks or its volume.
5. Keep commands scoped to the bach compose project. No host-wide `docker system|volume|network
   prune`, daemon restarts or reboots without coordinating — they take TawreedHR down too.
   (`docker image prune -f` only removes dangling images.)

## Emergency

```
docker logs bach-caddy-1 --tail 50          # bach's own TLS proxy
docker compose -p bach restart caddy
docker logs edge-haproxy-1 --tail 50        # shared router (root-owned; coordinate)
```
