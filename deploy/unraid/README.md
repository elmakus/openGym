# openGym — Unraid custom build (elmakus fork)

This image is built **from the code in this fork**, not from third-party published
openGym images. It packages the API and frontend into one image, exposed on
container port 80. The application source stays unchanged in the clean fork.

## Build

The `Build openGym for Unraid` GitHub Actions workflow builds:
1. `opengym-fork-api` from `api/Dockerfile`, target `default`.
2. `opengym-fork-web` from `web/Dockerfile`.
3. `ghcr.io/elmakus/opengym` using this directory's Dockerfile, which
   combines both locally built images and starts nginx/API under s6-overlay.

On successful test, `:latest` and `:sha-<commit>` are published to GHCR.
From Unraid's **Docker** tab use **Check for Updates**, then **Update**.
For a rollback choose a previously published sha tag in the Repository field.

## Unraid

The `unraid-template.xml` file belongs under
`/boot/config/plugins/dockerMan/templates-user/my-openGym.xml`.
Container name `openGym`, host port 8310 -> container port 80,
persistent `/mnt/user/appdata/opengym/data` -> `/data`.
Set `ORIGIN=https://gym.makowski.li` and `RP_ID=gym.makowski.li`.
Expose the host port through Cloudflare Tunnel. Register the first account
before allowing public access, or protect the hostname with Cloudflare Access.
Back up the entire `data` directory. Do not commit this directory to Git.

## Attribution

Application: Duarte Santos and contributors, AGPL-3.0-or-later.
The one-container s6 and nginx packaging is adapted from
[0x1917/opengym](https://github.com/0x1917/opengym), AGPL-3.0-or-later.
Exercise media carry their own terms; see the upstream NOTICE.md.

The s6 overlay build assets are fetched by CI with retry and cached. For manual
builds download the four v3.2.3.2 archives into `deploy/unraid/.build-assets/`
first; Dockerfile validates all four pinned SHA256 checksums.
