# Monitoring: Uptime Kuma (checks + med-alert dead-man's-switch), Netdata
# (host/PG metrics, cloud-free), and a systemd OnFailure→ntfy template.
# Error tracking (GlitchTip/Sentry) deliberately deferred — ADR-006.
{ config, pkgs, ... }:
{
  # ---- Uptime Kuma ------------------------------------------------------------
  # No host/port options — everything via `settings` (attrsOf STR, so "3001").
  # Module defaults HOST=127.0.0.1; served at the tailnet admin vhost ROOT
  # (Kuma cannot be subpath-hosted — verified upstream). State (incl. its ntfy
  # notification provider, configured in the UI in task A11) is in
  # /var/lib/uptime-kuma → backed up by restic.
  services.uptime-kuma = {
    enable = true;
    settings.PORT = "3001";
  };
  # A11 also creates a PUSH monitor whose URL the worker pings on every
  # successful med-alert dispatch (task B8) — the dead-man's-switch: if timed
  # alerts silently stop firing, Kuma alerts ntfy.

  # ---- Netdata (local-only) ----------------------------------------------------
  # pkgs.netdata is built withCloudUi=false; analytics off + never claimed
  # (both defaults). Reach it over the tailnet via SSH forward:
  #   ssh -L 19999:127.0.0.1:19999 root@zoomez  →  http://localhost:19999
  services.netdata = {
    enable = true;
    package = pkgs.netdata; # NOT pkgs.netdataCloud
    config = {
      global = {
        "update every" = 2;
        # Watch archiver lag + disk once WAL archiving is on (A10): a wedged
        # archive_command silently fills pg_wal until the disk is gone.
      };
      web."bind to" = "127.0.0.1";
      # If RAM gets tight on the 4GB box, cap dbengine retention here first.
    };
  };

  # ---- Unit failure → ntfy push ------------------------------------------------
  systemd.services."notify-failure@" = {
    description = "ntfy alert for failed unit %i";
    serviceConfig = {
      Type = "oneshot";
      EnvironmentFile = "/run/secrets/ntfy-env"; # NTFY_TOKEN=… (may be empty)
    };
    scriptArgs = "%i";
    script = ''
      ${pkgs.curl}/bin/curl -fsS -m 10 --retry 3 \
        -H "Authorization: Bearer ''${NTFY_TOKEN:-}" \
        -H "Title: zoomez: unit failed" \
        -H "Priority: high" -H "Tags: rotating_light" \
        -d "$1 failed on $(${pkgs.hostname}/bin/hostname) at $(date -Is)" \
        ${config.zoomez.ntfyUrl}
    '';
  };

  # Crash of anything load-bearing pushes to Justin's phone. (App units attach
  # their own onFailure in zoomez-app.nix; backup units in backups.nix.)
  systemd.services.postgresql.onFailure = [ "notify-failure@postgresql.service" ];
  systemd.services.caddy.onFailure = [ "notify-failure@caddy.service" ];
  systemd.services.garage.onFailure = [ "notify-failure@garage.service" ];
  systemd.services.centrifugo.onFailure = [ "notify-failure@centrifugo.service" ];
  systemd.services.docuseal.onFailure = [ "notify-failure@docuseal.service" ];
  # Caveat: if the failure IS the network, the curl can't send — that's what an
  # EXTERNAL check covers: point the homelab's Uptime Kuma (or this Kuma's push
  # monitor from the homelab side) at https://<domain> so total-box-down alerts
  # originate off-box. Set that up in A11.
}
