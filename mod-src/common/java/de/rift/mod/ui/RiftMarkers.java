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
    public static final class M { public Vec3 pos; long at; public int color; public String name, id; public java.util.UUID owner; public boolean priv; public int icon; }
    private static final String[] ICONS = {"\u2666", "\u2605", "\u2691", "\u2620", "\u2665"};
    private static final List<M> LIST = new ArrayList<>();
    private static final int[] COLORS = {0x7DD3FC, 0xFBBF24, 0xF87171, 0x4ADE80, 0xC084FC};
    private static int next = 0;

    private RiftMarkers() {}

    public static void place(Minecraft mc, boolean priv) {
        RiftConfig c = RiftConfig.get(); if (!c.markerOn || mc.player == null) return;
        HitResult hr = mc.player.pick(512.0, 1.0f, false);
        if (hr == null || hr.getType() == HitResult.Type.MISS) return;
        M m = new M(); m.pos = hr.getLocation(); m.at = System.currentTimeMillis(); m.color = priv ? 0xFFFFFF : COLORS[next++ % COLORS.length]; m.name = priv ? c.privateName : mc.player.getName().getString();
        m.priv = priv; m.icon = priv ? c.privateIcon : 0; m.owner = mc.player.getUUID(); m.id = "m" + Long.toString(System.nanoTime() & 0xffffffL, 36);
        synchronized (LIST) { if (LIST.size() >= 12) LIST.remove(0); LIST.add(m); }
        if (!priv) {   // an alle Rift-Spieler auf diesem Server senden
            com.google.gson.JsonObject o = new com.google.gson.JsonObject(); o.addProperty("t", "marker"); o.addProperty("id", m.id);
            o.addProperty("x", m.pos.x); o.addProperty("y", m.pos.y); o.addProperty("z", m.pos.z); o.addProperty("col", m.color); o.addProperty("nm", m.name); o.addProperty("ic", m.icon);
            de.rift.mod.RiftNet.send(o);
        }
    }
    public static void addRemote(java.util.UUID owner, String sender, String id, double x, double y, double z, int col, String nm, int ic) {
        M m = new M(); m.pos = new Vec3(x, y, z); m.at = System.currentTimeMillis(); m.color = col == 0 ? 0x7DD3FC : col; m.name = (nm == null || nm.isEmpty()) ? sender : nm; m.id = id; m.owner = owner; m.icon = ic;
        synchronized (LIST) { LIST.removeIf(o -> owner.equals(o.owner) && id.equals(o.id)); if (LIST.size() >= 24) LIST.remove(0); LIST.add(m); }
    }
    public static void removeRemote(java.util.UUID owner, String id) { synchronized (LIST) { LIST.removeIf(o -> owner.equals(o.owner) && id.equals(o.id)); } }

    /** Eigener (oder privater) Marker in der Naehe - zum Bearbeiten. */
    public static M nearestOwn(Minecraft mc, double max) {
        if (mc.player == null) return null; M best = null; double bd = max * max;
        synchronized (LIST) { for (M m : LIST) { if (!(m.priv || mc.player.getUUID().equals(m.owner))) continue; double d = m.pos.distanceToSqr(mc.player.position()); if (d < bd) { bd = d; best = m; } } }
        return best;
    }
    public static void remove(M m) { synchronized (LIST) { LIST.remove(m); } if (!m.priv) { com.google.gson.JsonObject o = new com.google.gson.JsonObject(); o.addProperty("t", "unmarker"); o.addProperty("id", m.id); de.rift.mod.RiftNet.send(o); } }
    public static void resend(M m) {
        if (m.priv) return; com.google.gson.JsonObject o = new com.google.gson.JsonObject(); o.addProperty("t", "marker"); o.addProperty("id", m.id);
        o.addProperty("x", m.pos.x); o.addProperty("y", m.pos.y); o.addProperty("z", m.pos.z); o.addProperty("col", m.color); o.addProperty("nm", m.name); o.addProperty("ic", m.icon); de.rift.mod.RiftNet.send(o);
    }
    public static int[] palette() { return COLORS; }

    private static void prune() {
        long ttl = RiftConfig.get().markerSeconds * 1000L, now = System.currentTimeMillis();
        synchronized (LIST) { LIST.removeIf(m -> now - m.at > ttl); }
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
        for (M m : new ArrayList<>(LIST)) {
            double dx = m.pos.x - eye.x, dy = m.pos.y - eye.y, dz = m.pos.z - eye.z;
            double depth = dx * fx + dy * fy + dz * fz; if (depth <= 0.1) continue;
            double sx = (dx * rx + dz * rz) / depth / tanX, sy = (dx * ux + dy * uy + dz * uz) / depth / tanY;
            int px = (int) (w / 2.0 + sx * w / 2.0), py = (int) (h / 2.0 - sy * h / 2.0);
            px = Mth.clamp(px, 12, w - 12); py = Mth.clamp(py, 12, h - 24);
            int dist = (int) Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
            String t = dist + "m";
            if (m.priv) {
                String ic = ICONS[Math.floorMod(m.icon, ICONS.length)]; RiftDraw.text(g, ic, px - RiftDraw.width(ic) / 2, py - 4, 0xFFFFFF);
                if (m.name != null && !m.name.isEmpty()) RiftDraw.text(g, m.name, px - RiftDraw.width(m.name) / 2, py + 7, 0xE5E7EB);
                RiftDraw.text(g, t, px - RiftDraw.width(t) / 2, py + 17, 0x9CA3AF);
            } else {
                if (m.icon > 0) RiftDraw.text(g, ICONS[Math.floorMod(m.icon, ICONS.length)], px - 4, py - 4, m.color); else diamond(g, px, py, 5, 0xFF000000 | m.color);
                if (m.owner != null) head(g, mc, m.owner, px - 6, py - 20, 12);
                RiftDraw.text(g, t, px - RiftDraw.width(t) / 2, py + 8, 0xFFFFFF);
                if (m.name != null && !m.name.isEmpty()) RiftDraw.text(g, m.name, px - RiftDraw.width(m.name) / 2, py + 18, 0xE5E7EB);
            }
        }
    }
    /** Auf der Richtungsleiste: kleine Raute an der Himmelsrichtung des Markers. */
    public static void drawOnCompass(GuiGraphics g, Minecraft mc, int x, int y, int w, int h, float yawNorth0) {
        if (mc.player == null || LIST.isEmpty()) return; prune();
        for (M m : new ArrayList<>(LIST)) {
            if (m.priv) continue;
            double dx = m.pos.x - mc.player.getX(), dz = m.pos.z - mc.player.getZ();
            float bearing = (float) Math.toDegrees(Math.atan2(-dx, dz)) + 180f;   // 0 = Norden
            float rel = Mth.wrapDegrees(bearing - yawNorth0); if (Math.abs(rel) > 85) continue;
            int px = x + w / 2 + Math.round(rel / 90f * (w / 2 - 6));
            diamond(g, px, y + h - 4, 3, 0xFF000000 | m.color);
        }
    }

    private static void head(GuiGraphics g, Minecraft mc, java.util.UUID u, int x, int y, int size) {
        try {
            var info = mc.getConnection() == null ? null : mc.getConnection().getPlayerInfo(u);
            if (info != null) net.minecraft.client.gui.components.PlayerFaceRenderer.draw(g, info.getSkin(), x, y, size);
        } catch (Throwable ignored) {}
    }

    static void diamond(GuiGraphics g, int cx, int cy, int r, int color) {
        for (int i = -r; i <= r; i++) { int ww = r - Math.abs(i); g.fill(cx - ww, cy + i, cx + ww + 1, cy + i + 1, color); }
    }
}
