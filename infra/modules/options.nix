# Deployment variables shared by every zoomez module.
{ lib, ... }:
{
  options.zoomez = {
    domain = lib.mkOption {
      type = lib.types.str;
      description = "Public apex domain for the app (sign./s3. subdomains derive from it).";
    };

    acmeEmail = lib.mkOption {
      type = lib.types.str;
      description = "ACME account email for Caddy's automatic TLS.";
    };

    tailscaleIp = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      description = ''
        This host's Tailscale IPv4 (100.x.y.z), set after the node joins the
        tailnet (task A2). Enables the tailnet-only admin vhost. null = disabled.
      '';
    };

    tailnetHost = lib.mkOption {
      type = lib.types.str;
      description = "MagicDNS name of this host (admin vhost; cert fetched from tailscaled).";
    };

    ntfyUrl = lib.mkOption {
      type = lib.types.str;
      description = "Full ntfy topic URL that receives systemd failure alerts.";
    };

    secretsProvisioned = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = ''
        Gate for sops-nix. Modules reference secrets by their stable runtime
        paths (/run/secrets/<name>), so the flake evaluates before any secret
        exists; flip this to true in task A3 once secrets/zoomez.yaml is
        committed and the host key is in .sops.yaml.
      '';
    };

    app = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Run the zoomez api + worker services (task B14).";
      };
      package = lib.mkOption {
        type = lib.types.nullOr lib.types.package;
        default = null;
        description = ''
          The built server package providing bin/zoomez-api and bin/zoomez-worker.
          Set in task B14: zoomez.app.package = pkgs.callPackage ../../../server/package.nix { };
        '';
      };
    };
  };
}
