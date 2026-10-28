package de.rift.mod.ui;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.Minecraft;
import org.lwjgl.glfw.GLFW;

/** Tasten-Abfrage ohne Fabric-API: Menü (Rechts-Shift) und Marker (Mausrad-Klick). */
public final class RiftInput {
    private static boolean menuDown, markDown, emoteDown;
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
    }
}
