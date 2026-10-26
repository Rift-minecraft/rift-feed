package de.rift.mod;

import net.fabricmc.api.ClientModInitializer;

public class RiftClient implements ClientModInitializer {
    @Override public void onInitializeClient() { RiftCosmetics.start(); }
}
