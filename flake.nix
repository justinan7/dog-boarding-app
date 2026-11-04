{
  description = "Zoomez — dog boarding app: server + PWA packages and the production NixOS host";

  inputs = {
    # NixOS 26.05 "Yarara" — current stable. Bump deliberately (infra/README).
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

    # DocuSeal stays on 2.5.3 (2.x line) until its 2 -> 3 database migration is planned and approved
    # (docs/plans/2026-11-04-zoomez-docuseal-3.md in the HomeLab repo). nixos-26.05 now ships DocuSeal 3.x,
    # so the package alone comes from this fixed rev; the module and everything else follow nixos-26.05.
    # Deliberately pinned by rev, not a branch: nixos_update.py leaves it alone.
    nixpkgs-docuseal.url = "github:NixOS/nixpkgs/0ad6f47ea4fe188f4bc8f0380f93ae8523337c6c";

    disko.url = "github:nix-community/disko/latest";
    disko.inputs.nixpkgs.follows = "nixpkgs";

    sops-nix.url = "github:Mic92/sops-nix";
    sops-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, nixpkgs-docuseal, disko, sops-nix }:
    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
    in {
      nixosConfigurations.zoomez = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          disko.nixosModules.disko
          sops-nix.nixosModules.sops
          ./infra/hosts/zoomez
          { services.docuseal.package = nixpkgs-docuseal.legacyPackages.x86_64-linux.docuseal; }
        ];
      };

      # `nix build .#server` / `.#web` — the same packages the host deploys.
      packages.x86_64-linux = {
        server = pkgs.callPackage ./server/package.nix { };
        web = pkgs.callPackage ./web/package.nix { };
      };

      # Operator shell: `nix develop` — sops editing + key tooling.
      devShells.x86_64-linux.default = pkgs.mkShell {
        packages = with pkgs; [ sops age ssh-to-age ];
      };
    };
}
