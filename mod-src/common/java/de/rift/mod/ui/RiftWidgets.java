package de.rift.mod.ui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.util.Mth;
import net.minecraft.world.effect.MobEffectInstance;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/** Alle HUD-Widgets. draw() zeichnet bei (x,y) und liefert {Breite, Höhe}. */
public final class RiftWidgets {
    public interface Drawer { int[] draw(GuiGraphics g, Minecraft mc, int x, int y); }
    public record Def(String id, String name, String group, Drawer drawer) {}

    public static final List<Def> ALL = new ArrayList<>();
    private static final long START = System.currentTimeMillis();

    private static void add(String id, String name, String group, Drawer d) { ALL.add(new Def(id, name, group, d)); }
    public static Def find(String id) { for (Def d : ALL) if (d.id().equals(id)) return d; return null; }

    private static int[] lines(GuiGraphics g, int x, int y, String... ls) {
        int w = 0; for (String s : ls) w = Math.max(w, RiftDraw.width(s));
        int pw = w + 10, ph = ls.length * 11 + 5;
        RiftDraw.panel(g, x, y, pw, ph);
        for (int i = 0; i < ls.length; i++) RiftDraw.text(g, ls[i], x + 5, y + 4 + i * 11, 0xFFFFFF);
        return new int[]{pw, ph};
    }
    private static int[] one(GuiGraphics g, int x, int y, String label, String value) {
        String a = label + " ", b = value;
        int w = RiftDraw.width(a) + RiftDraw.width(b) + 10, h = 16;
        RiftDraw.panel(g, x, y, w, h);
        RiftDraw.text(g, a, x + 5, y + 4, RiftConfig.get().accent);
        RiftDraw.text(g, b, x + 5 + RiftDraw.width(a), y + 4, 0xFFFFFF);
        return new int[]{w, h};
    }

    static {
        add("bossbar", "Boss Bar", "HUD", (g, mc, x, y) -> {
            if (!(mc.screen instanceof RiftMenuScreen)) return new int[]{182, 16};   // nur Vorschau
            RiftDraw.round(g, x, y + 9, x + 182, y + 14, 2, 0xAA7F1D1D);
            RiftDraw.text(g, "Boss Bar", x + 91 - RiftDraw.width("Boss Bar") / 2, y, 0xCCCCCC);
            return new int[]{182, 16};
        });
        add("hunger", "Hunger", "Spieler", (g, mc, x, y) -> one(g, x, y, "Hunger", mc.player == null ? "20" : String.valueOf(mc.player.getFoodData().getFoodLevel())));
        add("server", "Server", "Welt", (g, mc, x, y) -> {
            String s = "Einzelspieler"; try { if (mc.getCurrentServer() != null) s = mc.getCurrentServer().ip; } catch (Throwable ignored) {}
            return one(g, x, y, "Server", s);
        });
        add("target", "Ziel-Block", "Welt", (g, mc, x, y) -> {
            String b = "-";
            try { if (mc.hitResult instanceof net.minecraft.world.phys.BlockHitResult bh && mc.level != null) b = mc.level.getBlockState(bh.getBlockPos()).getBlock().getName().getString(); } catch (Throwable ignored) {}
            return one(g, x, y, "Ziel", b);
        });
        add("held", "Item in der Hand", "Spieler", (g, mc, x, y) -> {
            String n = "-", d = "";
            try { var st = mc.player.getMainHandItem(); if (!st.isEmpty()) { n = st.getHoverName().getString(); if (st.isDamageableItem()) d = " " + (st.getMaxDamage() - st.getDamageValue()) + "/" + st.getMaxDamage(); else if (st.getCount() > 1) d = " x" + st.getCount(); } } catch (Throwable ignored) {}
            return one(g, x, y, "Hand", n + d);
        });
        add("armor", "R\u00fcstung", "Spieler", (g, mc, x, y) -> {
            String[] ls = new String[4]; var slots = new net.minecraft.world.entity.EquipmentSlot[]{net.minecraft.world.entity.EquipmentSlot.HEAD, net.minecraft.world.entity.EquipmentSlot.CHEST, net.minecraft.world.entity.EquipmentSlot.LEGS, net.minecraft.world.entity.EquipmentSlot.FEET};
            String[] nm = {"Helm", "Brust", "Hose", "Schuhe"};
            for (int i = 0; i < 4; i++) { String v = "-"; try { var st = mc.player.getItemBySlot(slots[i]); if (!st.isEmpty()) v = st.isDamageableItem() ? (100 * (st.getMaxDamage() - st.getDamageValue()) / Math.max(1, st.getMaxDamage())) + " %" : "ok"; } catch (Throwable ignored) {} ls[i] = nm[i] + ": " + v; }
            return lines(g, x, y, ls);
        });
        add("fps", "FPS", "Spiel-Info", (g, mc, x, y) -> one(g, x, y, "FPS", String.valueOf(mc.getFps())));
        add("coords", "Koordinaten", "Spiel-Info", (g, mc, x, y) -> {
            LocalPlayer p = mc.player; if (p == null) return lines(g, x, y, "X: 0", "Y: 64", "Z: 0");
            return lines(g, x, y, "X: " + (int) Math.floor(p.getX()), "Y: " + (int) Math.floor(p.getY()), "Z: " + (int) Math.floor(p.getZ()));
        });
        add("ping", "Ping", "Spiel-Info", (g, mc, x, y) -> {
            int ping = 0;
            try { var pi = mc.getConnection().getPlayerInfo(mc.player.getUUID()); if (pi != null) ping = pi.getLatency(); } catch (Throwable ignored) {}
            return one(g, x, y, "Ping", ping + " ms");
        });
        add("clock", "Uhrzeit", "Spiel-Info", (g, mc, x, y) -> one(g, x, y, "Zeit", LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))));
        add("worldtime", "Weltzeit", "Spiel-Info", (g, mc, x, y) -> {
            long t = mc.level == null ? 0 : (mc.level.getDayTime() % 24000L); long h = (t / 1000 + 6) % 24, m = (t % 1000) * 60 / 1000;
            return one(g, x, y, "Welt", String.format("%02d:%02d", h, m));
        });
        add("playtime", "Spielzeit", "Spiel-Info", (g, mc, x, y) -> {
            long s = (System.currentTimeMillis() - START) / 1000;
            return one(g, x, y, "Spielzeit", String.format("%d:%02d:%02d", s / 3600, s / 60 % 60, s % 60));
        });
        add("memory", "Arbeitsspeicher", "Spiel-Info", (g, mc, x, y) -> {
            Runtime r = Runtime.getRuntime(); long used = (r.totalMemory() - r.freeMemory()) >> 20, max = r.maxMemory() >> 20;
            return one(g, x, y, "RAM", used + "/" + max + " MB");
        });
        add("speed", "Geschwindigkeit", "Spieler", (g, mc, x, y) -> {
            LocalPlayer p = mc.player; double s = p == null ? 0 : Math.hypot(p.getX() - p.xo, p.getZ() - p.zo) * 20;
            return one(g, x, y, "Speed", String.format("%.1f b/s", s));
        });
        add("facing", "Blickrichtung", "Spieler", (g, mc, x, y) -> {
            LocalPlayer p = mc.player; String d = p == null ? "south" : p.getDirection().getName();
            float yaw = p == null ? 0 : Mth.wrapDegrees(p.getYRot());
            return one(g, x, y, "Richtung", d + " (" + (int) yaw + ")");
        });
        add("biome", "Biom", "Welt", (g, mc, x, y) -> {
            String b = "plains";
            try { b = mc.level.getBiome(mc.player.blockPosition()).unwrapKey().map(k -> k.identifier().getPath()).orElse("?"); } catch (Throwable ignored) {}
            return one(g, x, y, "Biom", b.replace('_', ' '));
        });
        add("light", "Lichtlevel", "Welt", (g, mc, x, y) -> {
            int l = 15; try { l = mc.level.getMaxLocalRawBrightness(mc.player.blockPosition()); } catch (Throwable ignored) {}
            return one(g, x, y, "Licht", String.valueOf(l));
        });
        add("potion", "Trank-Effekte", "Spieler", (g, mc, x, y) -> {
            List<String> ls = new ArrayList<>();
            if (mc.player != null) for (MobEffectInstance e : mc.player.getActiveEffects()) { int s = e.getDuration() / 20; ls.add(e.getEffect().value().getDisplayName().getString() + " " + (e.getAmplifier() + 1) + "  " + s / 60 + ":" + String.format("%02d", s % 60)); }
            if (ls.isEmpty()) ls.add("Keine Effekte");
            return lines(g, x, y, ls.toArray(new String[0]));
        });
        add("keys", "Tasten (WASD)", "Spieler", (g, mc, x, y) -> {
            RiftConfig c = RiftConfig.get(); int s = 18;
            boolean w = mc.options.keyUp.isDown(), a = mc.options.keyLeft.isDown(), sd = mc.options.keyDown.isDown(), d = mc.options.keyRight.isDown();
            key(g, x + s + 2, y, s, "W", w, c); key(g, x, y + s + 2, s, "A", a, c); key(g, x + s + 2, y + s + 2, s, "S", sd, c); key(g, x + 2 * (s + 2), y + s + 2, s, "D", d, c);
            return new int[]{3 * s + 4, 2 * s + 2};
        });
        add("direction", "Richtungsleiste", "Spieler", (g, mc, x, y) -> {
            int w = 200, h = 18; RiftDraw.panel(g, x, y, w, h);
            float yaw = mc.player == null ? 0 : Mth.wrapDegrees(mc.player.getYRot() + 180f);   // 0 = Norden
            String[] names = {"N", "NO", "O", "SO", "S", "SW", "W", "NW"};
            for (int deg = -360; deg <= 720; deg += 15) {
                float rel = Mth.wrapDegrees(deg - yaw); if (Math.abs(rel) > 85) continue;
                int px = x + w / 2 + Math.round(rel / 90f * (w / 2 - 6));
                if (deg % 45 == 0) { String n = names[((deg % 360) + 360) % 360 / 45]; RiftDraw.text(g, n, px - RiftDraw.width(n) / 2, y + 5, deg % 90 == 0 ? RiftConfig.get().accent : 0xFFFFFF); }
                else g.fill(px, y + 6, px + 1, y + 12, 0x88FFFFFF);
            }
            RiftMarkers.drawOnCompass(g, mc, x, y, w, h, yaw);
            g.fill(x + w / 2, y, x + w / 2 + 1, y + 3, 0xFFFFFFFF);
            return new int[]{w, h};
        });
    }
    private static void key(GuiGraphics g, int x, int y, int s, String l, boolean down, RiftConfig c) {
        RiftDraw.round(g, x, y, x + s, y + s, c.rounding, down ? RiftDraw.argb(c.accent, 220) : RiftDraw.argb(0x0B0B10, c.alpha));
        RiftDraw.text(g, l, x + (s - RiftDraw.width(l)) / 2, y + 5, down ? 0x000000 : 0xFFFFFF);
    }
}
