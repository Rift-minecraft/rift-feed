package de.rift.mod.mixin;

import de.rift.mod.RiftEmoteState;
import net.minecraft.client.renderer.entity.state.EntityRenderState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;

@Mixin(EntityRenderState.class)
public abstract class EntityRenderStateMixin implements RiftEmoteState {
    @Unique private String rift$emote;
    @Unique private float rift$t;
    @Override public String rift$getEmote() { return rift$emote; }
    @Override public float rift$getT() { return rift$t; }
    @Override public void rift$set(String id, float t) { rift$emote = id; rift$t = t; }
}
