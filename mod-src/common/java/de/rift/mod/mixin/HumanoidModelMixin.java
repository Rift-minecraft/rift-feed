package de.rift.mod.mixin;

import de.rift.mod.RiftEmoteState;
import de.rift.mod.RiftEmotes;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.renderer.entity.state.HumanoidRenderState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Wendet die Emote-Posen auf das Koerpermodell an. */
@Mixin(HumanoidModel.class)
public abstract class HumanoidModelMixin {
    @Shadow @org.spongepowered.asm.mixin.Final public ModelPart head;
    @Shadow @org.spongepowered.asm.mixin.Final public ModelPart body;
    @Shadow @org.spongepowered.asm.mixin.Final public ModelPart rightArm;
    @Shadow @org.spongepowered.asm.mixin.Final public ModelPart leftArm;
    @Shadow @org.spongepowered.asm.mixin.Final public ModelPart rightLeg;
    @Shadow @org.spongepowered.asm.mixin.Final public ModelPart leftLeg;

    @Inject(method = "setupAnim(Lnet/minecraft/client/renderer/entity/state/HumanoidRenderState;)V", at = @At("TAIL"))
    private void rift$pose(HumanoidRenderState state, CallbackInfo ci) {
        RiftEmoteState es = (RiftEmoteState) (Object) state;
        String id = es.rift$getEmote(); if (id == null) return;
        RiftEmotes.pose(id, es.rift$getT(), head, body, rightArm, leftArm, rightLeg, leftLeg);
    }
}
