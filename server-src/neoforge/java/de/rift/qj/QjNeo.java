package de.rift.qj;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import net.neoforged.fml.ModList;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLLoader;
import net.neoforged.neoforgespi.language.IModInfo;

@Mod("riftquickjoin")
public class QjNeo {
    public QjNeo() {
        QuickJoin.LOADER = "neoforge";
        try { QuickJoin.MC = net.minecraft.SharedConstants.getCurrentVersion().name(); } catch (Throwable ignored) {}
        ModList.get().getModContainerById("neoforge").ifPresent((m) -> QuickJoin.LOADER_VERSION = m.getModInfo().getVersion().toString());
        QuickJoin.LISTER = () -> {
            List<QuickJoin.Entry> out = new ArrayList<>(); Set<String> skip = Set.of("minecraft", "neoforge", "riftquickjoin");
            for (IModInfo i : ModList.get().getMods()) {
                if (skip.contains(i.getModId())) continue;
                Path p = i.getOwningFile().getFile().getFilePath();
                out.add(new QuickJoin.Entry(i.getModId(), i.getDisplayName(), i.getVersion().toString(), p));
            }
            return out;
        };
    }
}
