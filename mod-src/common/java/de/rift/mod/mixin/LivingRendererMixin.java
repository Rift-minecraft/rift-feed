package de.rift.mod.mixin;

import de.rift.mod.RiftEmoteState;
import de.rift.mod.RiftEmotes;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Schreibt das laufende Emote des Spielers in den Render-State. */
@Mixin(LivingEntityRenderer.class)
public abstract class LivingRendererMixin {
    @Inject(method = "extractRenderState(Lnet/minecraft/world/entity/LivingEntity;Lnet/minecraft/client/renderer/entity/state/LivingEntityRenderState;F)V", at = @At("TAIL"))
    private void rift$emote(LivingEntity entity, LivingEntityRenderState state, float pt, CallbackInfo ci) {
        RiftEmoteState es = (RiftEmoteState) (Object) state;
        if (!(entity instanceof AbstractClientPlayer)) { es.rift$set(null, 0); return; }
        try {   // Rift-Nametag (auch ueber dem eigenen Kopf in der Aussenansicht)
            net.minecraft.client.Minecraft mc = net.minecraft.client.Minecraft.getInstance();
            if (state.nameTag != null) { net.minecraft.network.chat.Component n = de.rift.mod.RiftCosmetics.nameFor(entity.getUUID(), state.nameTag); if (n != null) state.nameTag = n; }
            else if (entity == mc.player && !mc.options.getCameraType().isFirstPerson() && !mc.options.hideGui) {
                net.minecraft.network.chat.Component n = de.rift.mod.RiftCosmetics.nameFor(entity.getUUID(), entity.getName());
                if (n != null) { state.nameTag = n; state.nameTagAttachment = new net.minecraft.world.phys.Vec3(0.0, entity.getBbHeight() + 0.5, 0.0); }
            }
        } catch (Throwable t) { de.rift.mod.RiftLog.err("Nametag: " + t); }
        RiftEmotes.Active a = RiftEmotes.get(entity.getUUID());
        if (a == null) { es.rift$set(null, 0); return; }
        float t = (System.currentTimeMillis() - a.start()) / 1000f;
        es.rift$set(a.id(), t);
        state.bodyRot += RiftEmotes.spin(a.id(), t);
    }
}
