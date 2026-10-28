package de.rift.mod.ui;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;
import org.lwjgl.glfw.GLFW;

/** Marker bearbeiten: Name, Symbol, Farbe, Loeschen. */
public class RiftMarkerEdit extends Screen {
    private static final String[] IC = {"\u2666", "\u2605", "\u2691", "\u2620", "\u2665"};
    private final RiftMarkers.M m;
    private EditBox box;
    public RiftMarkerEdit(RiftMarkers.M m) { super(Component.literal("Marker")); this.m = m; }
    @Override public boolean isPauseScreen() { return false; }

    @Override protected void init() {
        box = new EditBox(this.font, width / 2 - 90, height / 2 - 28, 180, 16, Component.literal("Name"));
        box.setMaxLength(24); box.setValue(m.name == null ? "" : m.name); box.setResponder(v -> m.name = v);
        this.addWidget(box); this.setFocused(box);
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float d) {
        RiftConfig c = RiftConfig.get(); int cx = width / 2, cy = height / 2;
        RiftDraw.round(g, cx - 110, cy - 70, cx + 110, cy + 74, 8, RiftDraw.argb(0x07080D, 190));
        RiftDraw.text(g, "Marker bearbeiten", cx - 100, cy - 60, c.accent);
        RiftDraw.text(g, "Name", cx - 90, cy - 40, 0x9CA3AF); box.render(g, mx, my, d);
        RiftDraw.text(g, "Symbol", cx - 90, cy - 4, 0x9CA3AF);
        for (int i = 0; i < IC.length; i++) {
            int x = cx - 90 + i * 28; boolean on = m.icon == i;
            RiftDraw.round(g, x, cy + 8, x + 22, cy + 26, 4, on ? RiftDraw.argb(c.accent, 160) : 0x33FFFFFF);
            RiftDraw.text(g, IC[i], x + 11 - RiftDraw.width(IC[i]) / 2, cy + 13, 0xFFFFFF);
        }
        if (!m.priv) {
            int[] pal = RiftMarkers.palette();
            for (int i = 0; i < pal.length; i++) { int x = cx - 90 + i * 28; RiftDraw.round(g, x, cy + 32, x + 22, cy + 44, 4, 0xFF000000 | pal[i]); if (m.color == pal[i]) RiftDraw.text(g, "\u2713", x + 8, cy + 34, 0x000000); }
        }
        btn(g, mx, my, cx - 90, cy + 50, 84, "L\u00f6schen", 0xF87171); btn(g, mx, my, cx + 6, cy + 50, 84, "Fertig", c.accent);
    }
    private void btn(GuiGraphics g, int mx, int my, int x, int y, int w, String t, int col) {
        boolean h = mx >= x && mx < x + w && my >= y && my < y + 18;
        RiftDraw.round(g, x, y, x + w, y + 18, 4, h ? RiftDraw.argb(col, 190) : RiftDraw.argb(col, 90));
        RiftDraw.text(g, t, x + w / 2 - RiftDraw.width(t) / 2, y + 5, 0xFFFFFF);
    }

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean dbl) {
        double mx = e.x(), my = e.y(); int cx = width / 2, cy = height / 2;
        for (int i = 0; i < IC.length; i++) { int x = cx - 90 + i * 28; if (mx >= x && mx < x + 22 && my >= cy + 8 && my < cy + 26) { m.icon = i; return true; } }
        if (!m.priv) { int[] pal = RiftMarkers.palette(); for (int i = 0; i < pal.length; i++) { int x = cx - 90 + i * 28; if (mx >= x && mx < x + 22 && my >= cy + 32 && my < cy + 44) { m.color = pal[i]; return true; } } }
        if (my >= cy + 50 && my < cy + 68) {
            if (mx >= cx - 90 && mx < cx - 6) { RiftMarkers.remove(m); onClose(); return true; }
            if (mx >= cx + 6 && mx < cx + 90) { finish(); return true; }
        }
        return super.mouseClicked(e, dbl);
    }
    private void finish() { if (m.priv) { RiftConfig c = RiftConfig.get(); c.privateName = m.name; c.privateIcon = m.icon; c.save(); } else RiftMarkers.resend(m); onClose(); }
    @Override public boolean keyPressed(KeyEvent e) {
        if (e.key() == GLFW.GLFW_KEY_ESCAPE) { finish(); return true; }
        if (e.key() == GLFW.GLFW_KEY_ENTER) { finish(); return true; }
        return super.keyPressed(e);
    }
}
