package de.rift.mod.ui;

import de.rift.mod.RiftEmotes;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;
import org.lwjgl.glfw.GLFW;

import java.util.List;

/** Emote-Rad: B halten, Emote anvisieren, B loslassen (oder klicken). */
public class RiftEmoteWheel extends Screen {
    private int hover = -1;
    private final List<String> ids;
    public RiftEmoteWheel() { super(Component.literal("Emotes")); List<String> m = RiftEmotes.wheel(); ids = (m == null || m.isEmpty()) ? List.of("wave", "dance") : m; }
    @Override public boolean isPauseScreen() { return false; }

    private int[] slot(int i) {
        int n = ids.size(); double ang = -Math.PI / 2 + i * 2 * Math.PI / n, r = Math.min(width, height) * 0.27;
        return new int[]{(int) (width / 2 + Math.cos(ang) * r), (int) (height / 2 + Math.sin(ang) * r)};
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float d) {
        RiftConfig c = RiftConfig.get();
        double dx = mx - width / 2.0, dy = my - height / 2.0; hover = -1;
        if (dx * dx + dy * dy > 24 * 24) {
            double ang = Math.atan2(dy, dx) + Math.PI / 2; if (ang < 0) ang += 2 * Math.PI;
            hover = (int) Math.round(ang / (2 * Math.PI / ids.size())) % ids.size();
        }
        if (GLFW.glfwGetKey(Minecraft.getInstance().getWindow().handle(), c.emoteKey) == GLFW.GLFW_RELEASE && System.currentTimeMillis() - opened > 250) { choose(); return; }
        RiftDraw.round(g, width / 2 - 22, height / 2 - 22, width / 2 + 22, height / 2 + 22, 22, RiftDraw.argb(0x0B0B10, 170));
        String ct = hover >= 0 ? RiftEmotes.NAMES.getOrDefault(ids.get(hover), ids.get(hover)) : "Emotes";
        RiftDraw.text(g, ct, width / 2 - RiftDraw.width(ct) / 2, height / 2 - 4, 0xFFFFFF);
        for (int i = 0; i < ids.size(); i++) {
            int[] p = slot(i); String nm = RiftEmotes.NAMES.getOrDefault(ids.get(i), ids.get(i)); int w = RiftDraw.width(nm) + 16;
            boolean on = i == hover;
            RiftDraw.round(g, p[0] - w / 2, p[1] - 11, p[0] + w / 2, p[1] + 11, 6, on ? RiftDraw.argb(c.accent, 200) : RiftDraw.argb(0x0B0B10, 170));
            RiftDraw.text(g, nm, p[0] - RiftDraw.width(nm) / 2, p[1] - 4, on ? 0x000000 : 0xFFFFFF);
        }
        RiftDraw.text(g, "Im Rift-Launcher unter Cosmetics \u2192 Emotes ausw\u00e4hlen", width / 2 - 100, height - 24, 0x9CA3AF);
    }
    private final long opened = System.currentTimeMillis();
    private void choose() {
        int h = hover; onClose();
        if (h >= 0) RiftEmotes.playLocal(ids.get(h));
    }
    @Override public boolean mouseClicked(MouseButtonEvent e, boolean dbl) { choose(); return true; }
    @Override public boolean keyPressed(KeyEvent e) { if (e.key() == GLFW.GLFW_KEY_ESCAPE) { onClose(); return true; } return super.keyPressed(e); }
}
