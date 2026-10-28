package de.rift.mod.ui;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.Minecraft;
import org.lwjgl.glfw.GLFW;

/** Tasten-Abfrage ohne Fabric-API: Menü (Rechts-Shift) und Marker (Mausrad-Klick). */
public final class RiftInput {
    private static boolean menuDown, markDown, emoteDown, coordDown, wasDead;
    private static long lastSave;
    private RiftInput() {}

    public static void tick(Minecraft mc) {
        if (mc.level == null || mc.player == null) return;
        RiftConfig c = RiftConfig.get();
        long win = mc.getWindow().handle();
        boolean m = GLFW.glfwGetKey(win, c.menuKey) == GLFW.GLFW_PRESS;
        if (m && !menuDown && mc.screen == null) mc.setScreen(new RiftMenuScreen());
        menuDown = m;
        boolean k = false;
        if (c.markerMouse >= 0) k = GLFW.glfwGetMouseButton(win, c.markerMouse) == GLFW.GLFW_PRESS;
        if (c.markerKey > 0) k |= GLFW.glfwGetKey(win, c.markerKey) == GLFW.GLFW_PRESS;
        if (k && !markDown && mc.screen == null && RiftMarkers.nearestOwn(mc, 10) != null && GLFW.glfwGetKey(win, GLFW.GLFW_KEY_LEFT_CONTROL) != GLFW.GLFW_PRESS) mc.setScreen(new RiftMarkerEdit(RiftMarkers.nearestOwn(mc, 10)));
        else if (k && !markDown && mc.screen == null) RiftMarkers.place(mc, GLFW.glfwGetKey(win, GLFW.GLFW_KEY_LEFT_CONTROL) == GLFW.GLFW_PRESS);
        markDown = k;
        boolean e = GLFW.glfwGetKey(win, c.emoteKey) == GLFW.GLFW_PRESS;
        if (e && !emoteDown && mc.screen == null) mc.setScreen(new RiftEmoteWheel());
        emoteDown = e;
        boolean co = c.coordKey > 0 && GLFW.glfwGetKey(win, c.coordKey) == GLFW.GLFW_PRESS;
        if (co && !coordDown && mc.screen == null) {   // H: Position in den Chat (Dimension + Koordinaten)
            String d = String.valueOf(mc.level.dimension()); int s = d.lastIndexOf(':'), q = d.indexOf(']'); d = s >= 0 && q > s ? d.substring(s + 1, q) : "?";
            String msg = "Meine Position: " + mc.player.getBlockX() + " " + mc.player.getBlockY() + " " + mc.player.getBlockZ() + " (" + d + ")";
            try { mc.player.connection.sendChat(msg); } catch (Throwable t) { RiftLog.err("Koordinaten: " + t); }
        }
        coordDown = co;
        boolean dead = mc.player.getHealth() <= 0f;   // Statistik: Tode zaehlen (steigende Flanke)
        if (dead && !wasDead) RiftStats.deaths++;
        wasDead = dead;
        if (System.currentTimeMillis() - lastSave > 60000) { lastSave = System.currentTimeMillis(); RiftStats.save(); }
    }
}
