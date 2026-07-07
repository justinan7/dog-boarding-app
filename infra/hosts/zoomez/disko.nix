# Disk layout — adapted from disko-templates#single-disk-ext4 (boots BIOS + UEFI).
# DigitalOcean droplets expose the disk as /dev/vda and boot BIOS/GRUB; root is the
# LAST partition at 100% so DO resizes/growpart grow it cleanly.
{ lib, ... }:
{
  disko.devices.disk.main = {
    device = lib.mkDefault "/dev/vda";
    type = "disk";
    content = {
      type = "gpt";
      partitions = {
        boot = {
          size = "1M";
          type = "EF02"; # GRUB BIOS boot — keep it; DO droplets boot BIOS
        };
        ESP = {
          size = "1G";
          type = "EF00";
          content = {
            type = "filesystem";
            format = "vfat";
            mountpoint = "/boot";
            mountOptions = [ "umask=0077" ]; # silences world-readable /boot warning
          };
        };
        root = {
          size = "100%"; # keep LAST so growpart/droplet-resize works
          content = {
            type = "filesystem";
            format = "ext4";
            mountpoint = "/";
          };
        };
      };
    };
  };

  # Swap is a swapfile, not a partition — disko doesn't manage swapfiles, and a
  # swap partition would break the root-must-be-last resize rule. Size in MiB.
  swapDevices = [ { device = "/var/lib/swapfile"; size = 4096; } ];
}
