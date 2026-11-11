package de.rift.qj;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.loader.api.FabricLoader;
import net.fabricmc.loader.api.ModContainer;
import net.fabricmc.loader.api.metadata.ModEnvironment;
import net.fabricmc.loader.api.metadata.ModOrigin;

public class QjFabric implements ModInitializer {
    @Override public void onInitialize() {
        FabricLoader fl = FabricLoader.getInstance();
        QuickJoin.LOADER = "fabric";
        fl.getModContainer("fabricloader").ifPresent((m) -> QuickJoin.LOADER_VERSION = m.getMetadata().getVersion().getFriendlyString());
        fl.getModContainer("minecraft").ifPresent((m) -> QuickJoin.MC = m.getMetadata().getVersion().getFriendlyString());
        QuickJoin.LISTER = () -> {
            List<QuickJoin.Entry> out = new ArrayList<>(); Set<String> skip = Set.of("minecraft", "java", "fabricloader", "mixinextras", "riftquickjoin");
            for (ModContainer c : fl.getAllMods()) {
                String id = c.getMetadata().getId(); if (skip.contains(id) || c.getContainingMod().isPresent()) continue;
                if (c.getMetadata().getEnvironment() == ModEnvironment.SERVER) continue;   // nur Server: Spieler brauchen sie nicht
                if (c.getOrigin().getKind() != ModOrigin.Kind.PATH) continue;
                for (Path p : c.getOrigin().getPaths()) out.add(new QuickJoin.Entry(id, c.getMetadata().getName(), c.getMetadata().getVersion().getFriendlyString(), p));
            }
            return out;
        };
    }
}
