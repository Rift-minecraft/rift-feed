package de.rift.qj;

import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.network.chat.Style;
import net.minecraft.network.protocol.status.ServerStatus;
import net.minecraft.server.MinecraftServer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(MinecraftServer.class)
public abstract class QjStatusMixin {
    @Inject(method = "buildServerStatus", at = @At("RETURN"), cancellable = true)
    private void riftqj$status(CallbackInfoReturnable<ServerStatus> cir) {
        try {
            ServerStatus st = cir.getReturnValue(); String p = QuickJoin.payload();
            if (st == null || p == null || p.isEmpty()) return;
            MutableComponent d = st.description().copy();
            d.append(Component.literal("").withStyle(Style.EMPTY.withInsertion(p)));   // unsichtbar: leerer Text, die Daten stehen im "insertion"-Feld
            cir.setReturnValue(new ServerStatus(d, st.players(), st.version(), st.favicon(), st.enforcesSecureChat()));
        } catch (Throwable ignored) {}
    }
}
