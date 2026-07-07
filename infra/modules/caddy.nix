# Caddy — the only public surface (auto-TLS via built-in ACME; no security.acme).
# reverse_proxy handles WebSocket upgrades automatically and flushes
# text/event-stream immediately — no header/flush tuning needed (verified).
{ config, lib, ... }:
let
  z = config.zoomez;
in
{
  services.caddy = {
    enable = true;
    email = z.acmeEmail;
    openFirewall = true; # TCP 80/443 + UDP 443 (HTTP/3)

    virtualHosts = lib.mkMerge [
      {
        # The app: PWA static + API from the monolith; realtime split to Centrifugo.
        "${z.domain}".extraConfig = ''
          encode zstd gzip
          handle /connection/* {
            reverse_proxy 127.0.0.1:8000
          }
          handle {
            reverse_proxy 127.0.0.1:3000
          }
        '';

        # DocuSeal hosted signing pages (customers deep-link here).
        "sign.${z.domain}".extraConfig = ''
          reverse_proxy 127.0.0.1:3002
        '';

        # Garage S3 — presigned PUT/GET straight from phones. Do NOT rewrite or
        # canonicalize the URI here: any path/query mutation breaks the SigV4
        # presigned signature. Access log discarded (presigned query strings).
        "s3.${z.domain}" = {
          extraConfig = ''
            reverse_proxy 127.0.0.1:3900
          '';
          logFormat = "output discard";
        };
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

  # Binding to the Tailscale IP races tailscaled at boot — order after it.
  systemd.services.caddy = lib.mkIf (z.tailscaleIp != null) {
    after = [ "tailscaled.service" ];
    wants = [ "tailscaled.service" ];
  };
}
