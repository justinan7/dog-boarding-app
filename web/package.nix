# The built Zoomez PWA — static assets the API serves via WEB_DIST (monolith
# mode, see server/src/app.ts). Output = the vite dist/ directory.
{ pkgs }:
pkgs.buildNpmPackage {
  pname = "zoomez-web";
  version = "0.1.0";
  src = ./.;
  nodejs = pkgs.nodejs_22;

  npmDeps = pkgs.importNpmLock { npmRoot = ./.; };
  npmConfigHook = pkgs.importNpmLock.npmConfigHook;
  npmBuildScript = "build";

  installPhase = ''
    runHook preInstall
    cp -r dist $out
    runHook postInstall
  '';

  meta.description = "Zoomez PWA (React + Vite) — built static assets";
}
