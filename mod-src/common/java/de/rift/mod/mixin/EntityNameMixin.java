package de.rift.mod.mixin;

import de.rift.mod.RiftCosmetics;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Rift-Nametag: Logo + Farbverlauf vor dem Namen anderer Rift-Spieler. */
@Mixin(Entity.class)
public abstract class EntityNameMixin {
    @Inject(method = "getDisplayName", at = @At("RETURN"), cancellable = true)
    private void rift$name(CallbackInfoReturnable<Component> cir) {
        Entity self = (Entity) (Object) this;
        if (!(self instanceof AbstractClientPlayer)) return;
        Component c = RiftCosmetics.nameFor(self.getUUID(), cir.getReturnValue());
        if (c != null) cir.setReturnValue(c);
    }
}
