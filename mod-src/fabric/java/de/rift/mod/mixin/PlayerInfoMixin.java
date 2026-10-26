package de.rift.mod.mixin;

import com.mojang.authlib.GameProfile;
import de.rift.mod.RiftCosmetics;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.world.entity.player.PlayerSkin;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Setzt das Rift-Cape in den Skin des Spielers - das Spiel zeichnet es dann ganz normal (inkl. Elytra). */
@Mixin(PlayerInfo.class)
public abstract class PlayerInfoMixin {
    @Shadow public abstract GameProfile getProfile();

    @Inject(method = "getSkin", at = @At("RETURN"), cancellable = true)
    private void rift$cape(CallbackInfoReturnable<PlayerSkin> cir) {
        PlayerSkin s = RiftCosmetics.withCape(RiftCosmetics.uuidOf(getProfile()), cir.getReturnValue());
        if (s != null) cir.setReturnValue(s);
    }
}
