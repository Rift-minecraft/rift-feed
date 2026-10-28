package de.rift.mod.mixin;

import de.rift.mod.ui.RiftConfig;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Verschiebt die echte Boss Bar an die Position aus dem Rift-Menue. */
@Mixin(Gui.class)
public abstract class GuiBossMixin {
    @Unique private boolean rift$moved;

    @Inject(method = "renderBossOverlay(Lnet/minecraft/client/gui/GuiGraphics;Lnet/minecraft/client/DeltaTracker;)V", at = @At("HEAD"))
    private void rift$bossStart(GuiGraphics g, DeltaTracker dt, CallbackInfo ci) {
        rift$moved = false;
        RiftConfig.W w = RiftConfig.get().widgets.get("bossbar"); if (w == null || !w.on) return;
        float s = w.s <= 0 ? 1f : w.s; int gw = g.guiWidth(), gh = g.guiHeight();
        g.pose().pushMatrix(); rift$moved = true;
        g.pose().translate(w.x * gw, w.y * gh - 3f); g.pose().scale(s, s); g.pose().translate(-(gw / 2f - 91f), 0f);
    }

    @Inject(method = "renderBossOverlay(Lnet/minecraft/client/gui/GuiGraphics;Lnet/minecraft/client/DeltaTracker;)V", at = @At("RETURN"))
    private void rift$bossEnd(GuiGraphics g, DeltaTracker dt, CallbackInfo ci) {
        if (rift$moved) { g.pose().popMatrix(); rift$moved = false; }
    }
}
