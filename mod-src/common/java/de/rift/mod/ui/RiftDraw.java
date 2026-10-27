package de.rift.mod.ui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;

/** Kleine Zeichenhelfer: abgerundete Flächen und Text im Rift-Stil. */
public final class RiftDraw {
    private RiftDraw() {}

    public static int argb(int rgb, int a) { return (a << 24) | (rgb & 0xFFFFFF); }

    public static void round(GuiGraphics g, int x1, int y1, int x2, int y2, int r, int color) {
        r = Math.max(0, Math.min(r, Math.min((x2 - x1) / 2, (y2 - y1) / 2)));
        if (r == 0) { g.fill(x1, y1, x2, y2, color); return; }
        g.fill(x1, y1 + r, x2, y2 - r, color);
        for (int i = 0; i < r; i++) {
            double dy = r - i - 0.5, dx = r - Math.sqrt(Math.max(0, r * r - dy * dy));
            int in = (int) Math.round(dx);
            g.fill(x1 + in, y1 + i, x2 - in, y1 + i + 1, color);
            g.fill(x1 + in, y2 - i - 1, x2 - in, y2 - i, color);
        }
    }

    /** Hintergrund eines HUD-Widgets nach den Design-Einstellungen. */
    public static void panel(GuiGraphics g, int x, int y, int w, int h) {
        RiftConfig c = RiftConfig.get();
        round(g, x, y, x + w, y + h, c.rounding, argb(0x0B0B10, c.alpha));
    }

    public static void text(GuiGraphics g, String s, int x, int y, int rgb) {
        g.drawString(Minecraft.getInstance().font, s, x, y, 0xFF000000 | rgb, RiftConfig.get().shadow);
    }

    public static int width(String s) { return Minecraft.getInstance().font.width(s); }
}
