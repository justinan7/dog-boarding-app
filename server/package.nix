# The Zoomez server package — bin/zoomez-api + bin/zoomez-worker from one
# buildNpmPackage (contract documented in infra/modules/zoomez-app.nix).
# importNpmLock = zero-hash-churn: `npm install foo` + commit the lockfile,
# then plain nixos-rebuild — no npmDepsHash to maintain (ADR-010).
{ pkgs }:
pkgs.buildNpmPackage {
  pname = "zoomez-server";
  version = "0.1.0";
  src = ./.;
  nodejs = pkgs.nodejs_22;

  npmDeps = pkgs.importNpmLock { npmRoot = ./.; };
  npmConfigHook = pkgs.importNpmLock.npmConfigHook;
  npmBuildScript = "build";

  # autoPatchelf fixes the ELF interpreter of sharp's prebuilt .node/.so
  # binaries (@img/sharp-linux-x64) for NixOS.
  nativeBuildInputs = [ pkgs.makeWrapper pkgs.autoPatchelfHook ];
  buildInputs = [ pkgs.stdenv.cc.cc.lib ];

  # tsup emits dist/{api,worker,migrate}.js with @electric-sql/pglite external
  # (dev-only) — prod never loads it. sharp ships prebuilt linux-x64 binaries
  # via its npm optional deps, which importNpmLock fetches from the lockfile.
  postInstall = ''
    # The lockfile carries BOTH glibc and musl sharp builds; sharp loads the
    # glibc one at runtime here, and the musl .so wants libc.musl which NixOS
    # doesn't ship — delete the dead variants so autoPatchelf doesn't choke.
    rm -rf $out/lib/node_modules/zoomez-server/node_modules/@img/*musl*

    # drizzle migrations ship with the package; MIGRATIONS_DIR points the
    # runtime at them regardless of the unit's cwd.
    for app in api worker migrate; do
      makeWrapper ${pkgs.nodejs_22}/bin/node $out/bin/zoomez-$app \
        --add-flags "$out/lib/node_modules/zoomez-server/dist/$app.js" \
        --set-default MIGRATIONS_DIR "$out/lib/node_modules/zoomez-server/migrations"
    done
  '';

  meta.description = "Zoomez API monolith + worker (Hono + Drizzle + Better Auth)";
}
