package de.rift.mod;

import net.minecraft.client.Minecraft;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.core.particles.ParticleOptions;
import net.minecraft.core.particles.ParticleTypes;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Emotes: Zustand pro Spieler, Posen und Partikel. */
public final class RiftEmotes {
    public record Active(String id, long start) {}
    private static final Map<UUID, Active> ACTIVE = new ConcurrentHashMap<>();
    public static volatile List<String> MY = List.of("wave", "dance");
    private static final Map<String, Integer> DUR = new HashMap<>();
    public static final Map<String, String> NAMES = new LinkedHashMap<>();
    private static final Random RND = new Random();
    private static int n = 0;
    static {
        String[][] d = {{"wave", "Winken", "3000"}, {"dance", "Tanz", "6000"}, {"bow", "Verbeugung", "2400"}, {"clap", "Applaus", "3000"}, {"flex", "Muskeln", "3000"},
            {"spin", "Pirouette", "2500"}, {"victory", "Siegerpose", "3500"}, {"ghost", "Geisterflug", "4000"}, {"pumpkin", "Kürbis-Wurf", "3200"},
            {"sword_surf", "Schwert-Surfer", "6000"}, {"cauldron", "Hexenkessel", "6000"}};
        for (String[] e : d) { NAMES.put(e[0], e[1]); DUR.put(e[0], Integer.parseInt(e[2])); }
    }
    private RiftEmotes() {}

    public static void play(UUID u, String id) {
        if (id == null || id.isEmpty() || !DUR.containsKey(id)) ACTIVE.remove(u); else ACTIVE.put(u, new Active(id, System.currentTimeMillis()));
    }
    public static Active get(UUID u) {
        Active a = ACTIVE.get(u); if (a == null) return null;
        if (System.currentTimeMillis() - a.start() > DUR.getOrDefault(a.id(), 3000)) { ACTIVE.remove(u); return null; }
        return a;
    }
    /** Eigenes Emote starten und an alle auf dem Server schicken. */
    public static void playLocal(String id) {
        Minecraft mc = Minecraft.getInstance(); if (mc.player == null) return;
        play(mc.player.getUUID(), id);
        com.google.gson.JsonObject o = new com.google.gson.JsonObject(); o.addProperty("t", "emote"); o.addProperty("e", id); RiftNet.send(o);
    }

    public static void tick(Minecraft mc) {
        if (mc.level == null || ACTIVE.isEmpty()) return;
        // Eigenes Emote bricht ab, sobald du dich bewegst
        if (mc.player != null && ACTIVE.containsKey(mc.player.getUUID())) {
            var v = mc.player.getDeltaMovement();
            if (v.x * v.x + v.z * v.z > 0.012 || mc.options.keyJump.isDown()) { play(mc.player.getUUID(), ""); com.google.gson.JsonObject o = new com.google.gson.JsonObject(); o.addProperty("t", "emote"); o.addProperty("e", ""); RiftNet.send(o); }
        }
        if ((++n & 1) != 0) return;
        for (AbstractClientPlayer p : mc.level.players()) {
            Active a = get(p.getUUID()); if (a == null) continue;
            double t = (System.currentTimeMillis() - a.start()) / 1000.0;
            switch (a.id()) {
                case "cauldron" -> { double ang = t * 4 + RND.nextDouble() * 6.28; sp(mc, p, ParticleTypes.WITCH, Math.cos(ang) * .8, .1, Math.sin(ang) * .8); sp(mc, p, ParticleTypes.HAPPY_VILLAGER, (RND.nextDouble() - .5) * .5, .3 + RND.nextDouble() * .5, (RND.nextDouble() - .5) * .5); }
                case "sword_surf" -> { sp(mc, p, ParticleTypes.CRIT, (RND.nextDouble() - .5) * .8, .05, (RND.nextDouble() - .5) * .8); sp(mc, p, ParticleTypes.CLOUD, (RND.nextDouble() - .5) * .5, .02, (RND.nextDouble() - .5) * .5); }
                case "ghost" -> sp(mc, p, ParticleTypes.SOUL, (RND.nextDouble() - .5) * .7, 1 + RND.nextDouble(), (RND.nextDouble() - .5) * .7);
                case "pumpkin" -> sp(mc, p, ParticleTypes.FLAME, (RND.nextDouble() - .5) * .5, 1.3, (RND.nextDouble() - .5) * .5);
                case "victory" -> sp(mc, p, ParticleTypes.FIREWORK, (RND.nextDouble() - .5) * .8, 2.0, (RND.nextDouble() - .5) * .8);
                case "dance" -> sp(mc, p, ParticleTypes.NOTE, (RND.nextDouble() - .5) * .8, 2.2, (RND.nextDouble() - .5) * .8);
                default -> {}
            }
        }
    }
    private static void sp(Minecraft mc, AbstractClientPlayer p, ParticleOptions po, double dx, double dy, double dz) {
        mc.level.addParticle(po, p.getX() + dx, p.getY() + dy, p.getZ() + dz, 0, 0.02, 0);
    }

    /** Dreht die Figur beim Pirouette-Emote. */
    public static float spin(String id, float t) { return "spin".equals(id) ? t * 720f : 0f; }

    /** Setzt die Posen (Winkel in Bogenmass; Modell-Koordinaten: +zRot hebt den rechten Arm nach aussen, -xRot nach vorne). */
    public static void pose(String id, float t, ModelPart head, ModelPart body, ModelPart ra, ModelPart la, ModelPart rl, ModelPart ll) {
        float s8 = (float) Math.sin(t * 8), s5 = (float) Math.sin(t * 5);
        switch (id) {
            case "wave" -> { ra.zRot = 2.7f + (float) Math.sin(t * 10) * .3f; ra.xRot = 0; head.zRot = .1f; }
            case "dance" -> {
                ra.xRot = -2.9f + s8 * .5f; la.xRot = -2.9f - s8 * .5f; ra.zRot = .3f; la.zRot = -.3f;
                body.yRot = (float) Math.sin(t * 4) * .4f; head.yRot = -body.yRot; rl.xRot = s8 * .6f; ll.xRot = -s8 * .6f;
            }
            case "bow" -> { float k = (float) Math.sin(Math.min(1f, t / 2.4f) * Math.PI); body.xRot = .9f * k; head.xRot = .5f * k; ra.xRot = .9f * k; la.xRot = .9f * k; }
            case "clap" -> { float c = Math.abs((float) Math.sin(t * 9)); ra.xRot = la.xRot = -1.35f; ra.yRot = -(.1f + .5f * c); la.yRot = .1f + .5f * c; }
            case "flex" -> { float p = (float) Math.sin(t * 6) * .12f; ra.zRot = 1.45f + p; la.zRot = -1.45f - p; ra.xRot = la.xRot = -.3f; head.xRot = -.1f; }
            case "spin" -> { ra.zRot = .8f; la.zRot = -.8f; }
            case "victory" -> { ra.xRot = -3.0f; ra.zRot = .2f; la.zRot = -.3f; la.xRot = -.2f; head.xRot = -.3f; }
            case "ghost" -> { ra.xRot = la.xRot = -1.5f + (float) Math.sin(t * 3) * .15f; body.xRot = .25f; head.xRot = .2f; }
            case "pumpkin" -> { float p = (t % 1.6f) / 1.6f; ra.xRot = p < .6f ? -3.0f * (p / .6f) : -3.0f + ((p - .6f) / .4f) * 2.6f; body.yRot = p < .6f ? 0 : -.3f; }
            case "sword_surf" -> { body.yRot = .6f; head.yRot = -.6f; rl.zRot = .25f; ll.zRot = -.25f; ra.zRot = 1.3f + s5 * .1f; la.zRot = -1.3f - s5 * .1f; body.zRot = (float) Math.sin(t * 2) * .12f; }
            case "cauldron" -> { ra.xRot = -1.2f; ra.yRot = (float) Math.sin(t * 5) * .5f; la.xRot = -1.0f; la.yRot = (float) Math.cos(t * 5) * .3f; head.xRot = .3f; }
            default -> {}
        }
    }
}
