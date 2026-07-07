{
  description = "Zoomez production host — single NixOS VPS (design + runbooks in ./README.md)";

  inputs = {
    # NixOS 26.05 "Yarara" — current stable (released 2026-05-30, supported to 2026-12-31).
    # Bump to 26.11 deliberately (see README "Upgrade policy"), never blindly.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

    disko.url = "github:nix-community/disko/latest";
    disko.inputs.nixpkgs.follows = "nixpkgs";

    sops-nix.url = "github:Mic92/sops-nix";
    sops-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, disko, sops-nix }: {
    nixosConfigurations.zoomez = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        disko.nixosModules.disko
        sops-nix.nixosModules.sops
        ./hosts/zoomez
      ];
    };

    # Operator shell: `nix develop ./infra` — sops editing + key tooling.
    devShells.x86_64-linux.default =
      let pkgs = nixpkgs.legacyPackages.x86_64-linux;
      in pkgs.mkShell {
        packages = with pkgs; [ sops age ssh-to-age ];
      };
  };
}
