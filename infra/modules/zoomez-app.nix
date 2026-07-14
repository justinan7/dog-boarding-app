# The Zoomez monolith: two hardened systemd services (api + worker) from ONE
# package. Disabled until server/ exists (task B14 sets zoomez.app.{enable,package}).
#
# server/package.nix spec (task B14 writes it — this is the contract):
#   { pkgs }:
#   pkgs.buildNpmPackage {
#     pname = "zoomez-server"; version = "0.1.0";
#     src = ../server;                      # package.json + package-lock.json (npm, NOT pnpm)
#     nodejs = pkgs.nodejs_22;              # nodejs_20 is EOL; _22 = LTS to 2027
#     # Zero-hash-churn dep fetching — `npm install foo && git add package-lock.json`
#     # then plain nixos-rebuild; no npmDepsHash to maintain:
#     npmDeps = pkgs.importNpmLock { npmRoot = ../server; };
#     npmConfigHook = pkgs.importNpmLock.npmConfigHook;
#     npmBuildScript = "build";
#     nativeBuildInputs = [ pkgs.makeWrapper ];   # (+ python3/node-gyp if sharp needs it)
#     postInstall = ''
#       for app in api worker; do
#         makeWrapper ${pkgs.nodejs_22}/bin/node $out/bin/zoomez-$app \
#           --add-flags "$out/lib/node_modules/zoomez-server/dist/$app.js"
#       done
#     '';
#   }
{ config, lib, ... }:
let
  cfg = config.zoomez.app;

  mkSvc = name: {
    description = "Zoomez ${name}";
    wantedBy = [ "multi-user.target" ];
    after = [
      "network-online.target"
      "postgresql.service"
      "garage.service"
      "centrifugo.service"
    ];
    wants = [ "network-online.target" ];
    requires = [ "postgresql.service" ];
    environment = {
      NODE_ENV = "production";
      PUBLIC_DOMAIN = config.zoomez.domain;
      DEMO_MODE = if cfg.demoMode then "true" else "false";
    } // lib.optionalAttrs (cfg.webRoot != null) { WEB_DIST = "${cfg.webRoot}"; };
    onFailure = [ "notify-failure@zoomez-${name}.service" ];
    serviceConfig = {
      ExecStart = "${cfg.package}/bin/zoomez-${name}";
      Restart = "on-failure";
      RestartSec = 5;

      DynamicUser = true;
      User = "zoomez";            # same User in both units ⇒ same dynamic UID,
      StateDirectory = "zoomez";  # so api + worker share /var/lib/zoomez
      EnvironmentFile = "/run/secrets/zoomez-env"; # read by root pre-drop

      # Hardening — everything here is Node-safe. Do NOT add
      # MemoryDenyWriteExecute: the V8 JIT needs W^X and will crash.
      NoNewPrivileges = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      PrivateTmp = true;
      PrivateDevices = true;
      ProtectKernelTunables = true;
      ProtectControlGroups = true;
      RestrictAddressFamilies = [ "AF_INET" "AF_INET6" "AF_UNIX" ];
      RestrictNamespaces = true;
      LockPersonality = true;
      SystemCallFilter = [ "@system-service" ];
      CapabilityBoundingSet = "";
    };
  };
in
lib.mkIf (cfg.enable && cfg.package != null) {
  # api: serves the PWA + REST on 127.0.0.1:3000 (behind Caddy) and runs the
  #      pg-boss producer. worker: pg-boss consumer — timed med/task alerts,
  #      HEIC processing, webhooks reconciliation. Separate unit so a due med
  #      alert survives an api deploy/restart.
  systemd.services.zoomez-api = mkSvc "api";
  systemd.services.zoomez-worker = mkSvc "worker";

  # Demo-world freshness: reseed nightly so the sample world always reads
  # "today" (the seed anchors its dates to the current date and preserves the
  # auth tables — nobody's login is touched). Gone when demoMode = false.
  systemd.services.zoomez-demo-reseed = lib.mkIf cfg.demoMode {
    description = "Zoomez demo-world nightly reseed";
    after = [ "postgresql.service" ];
    requires = [ "postgresql.service" ];
    environment = { NODE_ENV = "production"; DEMO_MODE = "true"; };
    serviceConfig = {
      Type = "oneshot";
      EnvironmentFile = "/run/secrets/zoomez-env";
      ExecStart = "${cfg.package}/bin/zoomez-seed";
    };
  };
  systemd.timers.zoomez-demo-reseed = lib.mkIf cfg.demoMode {
    wantedBy = [ "timers.target" ];
    # ~2am Pacific — nobody is exploring the demo then.
    timerConfig = { OnCalendar = "*-*-* 09:30:00 UTC"; Persistent = true; };
  };
}
