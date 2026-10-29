package de.rift.mod.mixin;

import de.rift.mod.ui.RiftJoinAnim;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(Screen.class)
public abstract class ScreenJoinMixin {
    @Inject(method = "renderWithTooltipAndSubtitles", at = @At("TAIL"))
    private void rift$join(GuiGraphics g, int mx, int my, float d, CallbackInfo ci) {
        try { RiftJoinAnim.drawScreen(g, Minecraft.getInstance(), (Screen) (Object) this); } catch (Throwable ignored) {}
    }
}
