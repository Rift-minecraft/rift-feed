package de.rift.mod;

/** Wird per Mixin an den Render-State jeder Figur gehaengt: welches Emote laeuft gerade (und seit wie vielen Sekunden). */
public interface RiftEmoteState {
    String rift$getEmote();
    float rift$getT();
    void rift$set(String id, float t);
}
