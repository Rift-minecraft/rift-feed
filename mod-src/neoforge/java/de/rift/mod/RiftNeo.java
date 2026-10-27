package de.rift.mod;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.common.Mod;

@Mod(value = "rift", dist = Dist.CLIENT)
public class RiftNeo {
    public RiftNeo() { RiftCosmetics.start(); }
}
