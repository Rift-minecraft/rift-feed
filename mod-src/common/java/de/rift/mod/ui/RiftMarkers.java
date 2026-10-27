package de.rift.mod.ui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.util.Mth;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.List;

/** Marker (Mausrad-Klick): zeigt Ziel und Entfernung in Blöcken in der Welt und auf der Richtungsleiste. */
public final class RiftMarkers {
    public static final class M { Vec3 pos; long at; int color; String name; }
    private static final List<M> LIST = new ArrayList<>();
    private static final int[] COLORS = {0x7DD3FC, 0xFBBF24, 0xF87171, 0x4ADE80, 0xC084FC};
    private static int next = 0;

    private RiftMarkers() {}

    public static void place(Minecraft mc) {
        RiftConfig c = RiftConfig.get(); if (!c.markerOn || mc.player == null) return;
        HitResult hr = mc.player.pick(512.0, 1.0f, false);
        if (hr == null || hr.getType() == HitResult.Type.MISS) return;
        M m = new M(); m.pos = hr.getLocation(); m.at = System.currentTimeMillis(); m.color = COLORS[next++ % COLORS.length]; m.name = mc.player.getName().getString();
        if (LIST.size() >= 8) LIST.remove(0);
        LIST.add(m);
    }

    private static void prune() {
        long ttl = RiftConfig.get().markerSeconds * 1000L, now = System.currentTimeMillis();
        LIST.removeIf(m -> now - m.at > ttl);
    }

    /** In der Welt: Raute + Entfernung. */
    public static void drawWorld(GuiGraphics g, Minecraft mc) {
        if (mc.player == null || LIST.isEmpty()) return; prune();
        int w = g.guiWidth(), h = g.guiHeight();
        Vec3 eye = mc.player.getEyePosition();
        double yaw = Math.toRadians(mc.player.getYRot()), pit = Math.toRadians(mc.player.getXRot());
        double fx = -Math.sin(yaw) * Math.cos(pit), fy = -Math.sin(pit), fz = Math.cos(yaw) * Math.cos(pit);
        double rx = -Math.cos(yaw), rz = -Math.sin(yaw);
        double ux = 0 * fz - 0 * fy, uy = rz * fx - rx * fz, uz = rx * fy - 0 * fx;   // up = r x f  (r hat keine y-Komponente)
        ux = 0 * fz - 0 * fy;
        // r = (rx,0,rz), f = (fx,fy,fz): r x f = (0*fz - rz*fy, rz*fx - rx*fz, rx*fy - 0*fx)
        ux = -rz * fy;
        double tanY = Math.tan(Math.toRadians(mc.options.fov().get()) / 2), tanX = tanY * w / (double) h;
        for (M m : LIST) {
            double dx = m.pos.x - eye.x, dy = m.pos.y - eye.y, dz = m.pos.z - eye.z;
            double depth = dx * fx + dy * fy + dz * fz; if (depth <= 0.1) continue;
            double sx = (dx * rx + dz * rz) / depth / tanX, sy = (dx * ux + dy * uy + dz * uz) / depth / tanY;
            int px = (int) (w / 2.0 + sx * w / 2.0), py = (int) (h / 2.0 - sy * h / 2.0);
            px = Mth.clamp(px, 12, w - 12); py = Mth.clamp(py, 12, h - 24);
            int dist = (int) Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
            diamond(g, px, py, 5, 0xFF000000 | m.color);
            String t = dist + "m"; RiftDraw.text(g, t, px - RiftDraw.width(t) / 2, py + 8, 0xFFFFFF);
        }
    }
    /** Auf der Richtungsleiste: kleine Raute an der Himmelsrichtung des Markers. */
    public static void drawOnCompass(GuiGraphics g, Minecraft mc, int x, int y, int w, int h, float yawNorth0) {
        if (mc.player == null || LIST.isEmpty()) return; prune();
        for (M m : LIST) {
            double dx = m.pos.x - mc.player.getX(), dz = m.pos.z - mc.player.getZ();
            float bearing = (float) Math.toDegrees(Math.atan2(-dx, dz)) + 180f;   // 0 = Norden
            float rel = Mth.wrapDegrees(bearing - yawNorth0); if (Math.abs(rel) > 85) continue;
            int px = x + w / 2 + Math.round(rel / 90f * (w / 2 - 6));
            diamond(g, px, y + h - 4, 3, 0xFF000000 | m.color);
        }
    }

    static void diamond(GuiGraphics g, int cx, int cy, int r, int color) {
        for (int i = -r; i <= r; i++) { int ww = r - Math.abs(i); g.fill(cx - ww, cy + i, cx + ww + 1, cy + i + 1, color); }
    }
}
