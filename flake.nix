{
  description = "Zoomez — dog boarding app: server + PWA packages and the production NixOS host";

  inputs = {
    # NixOS 26.05 "Yarara" — current stable. Bump deliberately (infra/README).
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

    disko.url = "github:nix-community/disko/latest";
    disko.inputs.nixpkgs.follows = "nixpkgs";

    sops-nix.url = "github:Mic92/sops-nix";
    sops-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, disko, sops-nix }:
    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
    in {
      nixosConfigurations.zoomez = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          disko.nixosModules.disko
          sops-nix.nixosModules.sops
          ./infra/hosts/zoomez
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
