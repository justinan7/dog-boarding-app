# Caddy — the only public surface (auto-TLS via built-in ACME; no security.acme).
# reverse_proxy handles WebSocket upgrades automatically and flushes
# text/event-stream immediately — no header/flush tuning needed (verified).
{ config, lib, pkgs, ... }:
let
  z = config.zoomez;
  # Caddy binds the tailnet address, which is briefly missing at boot and whenever a switch reconfigures the
  # network. Wait for it (up to 2 min) instead of exiting 1 on "cannot assign requested address".
  waitTailnetIp = pkgs.writeShellScript "wait-tailnet-ip" ''
    for i in $(seq 120); do
      ${pkgs.iproute2}/bin/ip -4 addr show dev tailscale0 2>/dev/null | ${pkgs.gnugrep}/bin/grep -q 'inet ${z.tailscaleIp}/' && exit 0
      sleep 1
    done
    echo "${z.tailscaleIp} still not on tailscale0 after 120s; starting anyway" >&2
    exit 0
  '';
in
{
  services.caddy = {
    enable = true;
    email = z.acmeEmail;
    openFirewall = true; # TCP 80/443 + UDP 443 (HTTP/3)

    virtualHosts = lib.mkMerge [
      {
        # Homelab topology: TLS terminates at the RackNerd Caddy, which proxies
        # over the tailnet to these plain-HTTP vhosts (the http:// prefix keeps
        # this Caddy from trying ACME for names whose DNS points elsewhere).
        # Moving to a public VPS later = drop the http:// prefixes.

        # The app: PWA static + API from the monolith; realtime split to Centrifugo.
        "http://${z.domain}".extraConfig = ''
          encode zstd gzip
          handle /connection/* {
            reverse_proxy 127.0.0.1:8000
          }
          handle {
            reverse_proxy 127.0.0.1:3000
          }
        '';

        # DocuSeal hosted signing pages (customers deep-link here).
        "http://sign.${z.domain}".extraConfig = ''
          reverse_proxy 127.0.0.1:3002
        '';

        # (No s3 vhost: media flows through the API per ADR-013.)
      }

      # Tailnet-only admin vhost (Uptime Kuma at the root — Kuma cannot live
      # under a subpath, verified upstream). Cert comes from tailscaled
      # (services.tailscale.permitCertUid = "caddy" in core.nix).
      (lib.mkIf (z.tailscaleIp != null) {
        "${z.tailnetHost}" = {
          listenAddresses = [ z.tailscaleIp ]; # unreachable from the public interface
          extraConfig = ''
            reverse_proxy 127.0.0.1:3001
          '';
          logFormat = "output discard";
        };
      })
    ];
  };

  # Binding to the Tailscale IP races tailscaled at boot. After= only waits for the daemon to start, not for
  # its address to exist. The upstream module already restarts on failure, but with no RestartSec its 10
  # allowed starts per 4 h were spent in about a second, all before the address existed: on 2026-10-09 it
  # gave up ("cannot assign requested address") and the public site stayed down for 25 days. Space the
  # retries 5 s apart and never give up.
  #
  # 2026-11-04: that was not enough. The upstream module also sets RestartPreventExitStatus=1, and Caddy exits 1
  # on a bind failure, so systemd never retried at all: a nixpkgs update switch left the public site 502 for
  # about 3 minutes (and made the update roll back). Two fixes: wait for the address before starting, and let
  # exit status 1 restart too.
  systemd.services.caddy = lib.mkIf (z.tailscaleIp != null) {
    after = [ "tailscaled.service" ];
    wants = [ "tailscaled.service" ];
    startLimitIntervalSec = lib.mkForce 0;
    serviceConfig.RestartSec = lib.mkForce "5s";
    serviceConfig.RestartPreventExitStatus = lib.mkForce "";
    serviceConfig.ExecStartPre = [ "${waitTailnetIp}" ];
    serviceConfig.TimeoutStartSec = lib.mkForce "150s";
  };
}
