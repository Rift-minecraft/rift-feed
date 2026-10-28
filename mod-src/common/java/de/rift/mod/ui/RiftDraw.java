package de.rift.mod.ui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.FontDescription;
import net.minecraft.network.chat.Style;
import net.minecraft.resources.Identifier;

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

    private static final FontDescription RIFT_FONT = new FontDescription.Resource(Identifier.fromNamespaceAndPath("rift", "ui"));
    public static Component comp(String s) {
        Component c = Component.literal(s);
        return RiftConfig.get().riftFont ? c.copy().withStyle(Style.EMPTY.withFont(RIFT_FONT)) : c;
    }
    public static void text(GuiGraphics g, String s, int x, int y, int rgb) {
        g.drawString(Minecraft.getInstance().font, comp(s), x, y, 0xFF000000 | rgb, RiftConfig.get().shadow);
    }
    public static int width(String s) { return Minecraft.getInstance().font.width(comp(s)); }
    /** Text mit automatischem Umbruch; liefert die Hoehe. */
    public static int wrap(GuiGraphics g, String s, int x, int y, int maxW, int rgb) {
        StringBuilder line = new StringBuilder(); int yy = y;
        for (String w : s.split(" ")) {
            String t = line.length() == 0 ? w : line + " " + w;
            if (width(t) > maxW && line.length() > 0) { text(g, line.toString(), x, yy, rgb); yy += 11; line = new StringBuilder(w); } else line = new StringBuilder(t);
        }
        if (line.length() > 0) { text(g, line.toString(), x, yy, rgb); yy += 11; }
        return yy - y;
    }
}
