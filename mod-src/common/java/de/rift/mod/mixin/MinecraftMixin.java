package de.rift.mod.mixin;

import de.rift.mod.RiftCosmetics;
import net.minecraft.client.Minecraft;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(Minecraft.class)
public abstract class MinecraftMixin {
    @Inject(method = "tick", at = @At("TAIL"))
    private void rift$tick(CallbackInfo ci) { RiftCosmetics.tick((Minecraft) (Object) this); de.rift.mod.ui.RiftInput.tick((Minecraft) (Object) this); }
}
