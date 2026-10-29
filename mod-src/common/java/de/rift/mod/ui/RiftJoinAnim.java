package de.rift.mod.ui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.GenericMessageScreen;
import net.minecraft.client.gui.screens.LevelLoadingScreen;
import net.minecraft.client.gui.screens.Screen;

/** Beitritts-Animation: Rift-Stern in der Mitte, Status klein unten; beim Fertigwerden oeffnet sich eine Blende (rueckwaerts) direkt ins Spiel. */
public final class RiftJoinAnim {
    private static long start, lastSeen, exitAt; private static boolean active, exiting;
    private RiftJoinAnim() {}

    public static boolean isJoin(Minecraft mc, Screen s) {
        return s instanceof ConnectScreen || s instanceof LevelLoadingScreen || (s instanceof GenericMessageScreen && mc.level == null);
    }

    /** Vierzackiger Stern (Rift-Logo) als Scanlines. */
    public static void star(GuiGraphics g, int cx, int cy, double R, int color) {
        int r = (int) Math.ceil(R);
        for (int y = -r; y <= r; y++) {
            double a = Math.abs(y) / R; if (a > 1) continue;
            double hw = R * Math.pow(1 - Math.pow(a, 2.0 / 3), 1.5); if (hw < 0.5) continue;
            g.fill(cx - (int) hw, cy + y, cx + (int) hw + 1, cy + y + 1, color);
        }
    }
    private static void disc(GuiGraphics g, int cx, int cy, double R, int color) {
        int r = (int) Math.ceil(R);
        for (int y = -r; y <= r; y++) { double hw = Math.sqrt(Math.max(0, R * R - (double) y * y)); if (hw < 0.5) continue; g.fill(cx - (int) hw, cy + y, cx + (int) hw + 1, cy + y + 1, color); }
    }

    /** Wird nach jedem Screen gezeichnet (Mixin). Deckt den Standard-Text in der Mitte komplett ab. */
    public static void drawScreen(GuiGraphics g, Minecraft mc, Screen s) {
        RiftConfig c = RiftConfig.get();
        if (!c.joinAnim || !isJoin(mc, s)) return;
        long now = System.currentTimeMillis();
        if (!active || exiting || now - lastSeen > 1500) { active = true; exiting = false; start = now; }
        lastSeen = now;
        float t = (now - start) / 1000f; int W = g.guiWidth(), H = g.guiHeight(), cx = W / 2, cy = H / 2 - 8;
        int bg = (int) (255 * Math.min(1f, t / 0.2f));
        g.fill(0, 0, W, H, RiftDraw.argb(0x07080D, bg));
        float fa = Math.min(1f, Math.max(0f, (t - 0.1f) / 0.4f));
        for (int i = 4; i >= 1; i--) disc(g, cx, cy, 30 + i * 16 + 3 * Math.sin(t * 2), RiftDraw.argb(c.accent, (int) (9 * fa)));
        float k = Math.min(1f, t / 0.6f); double e = 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
        double R = 34 * e * (1 + 0.035 * Math.sin(t * 3.2));
        star(g, cx, cy, R * 1.25, RiftDraw.argb(c.accent, (int) (50 * fa)));
        star(g, cx, cy, R, RiftDraw.argb(0xFFFFFF, (int) (255 * fa)));
        String logo = "RIFT"; RiftDraw.text(g, logo, cx - RiftDraw.width(logo) / 2, cy + 46, 0x9CA3AF);
        // Status klein unten links (statt gross in der Mitte)
        boolean de = "de".equals(java.util.Locale.getDefault().getLanguage());
        String what = s instanceof ConnectScreen ? (de ? "Verbinde mit Server" : "Connecting to server") : (de ? "Betrete Welt" : "Joining world");
        String dots = ".".repeat(1 + (int) (t * 2.5) % 3);
        RiftDraw.text(g, what + dots, 14, H - 20, 0x9CA3AF);
        // dezenter Lauf-Balken ganz unten
        int bw = W / 4, bx = (int) (((t * 0.55f) % 1.3f - 0.15f) * W);
        g.fill(0, H - 2, W, H, RiftDraw.argb(c.accent, 30));
        g.fill(Math.max(0, bx), H - 2, Math.min(W, bx + bw), H, RiftDraw.argb(c.accent, 220));
    }

    /** Wird im HUD gezeichnet (Mixin): Sobald der Ladebildschirm weg ist, oeffnet sich die Blende und das Spiel ist schon da. */
    public static void drawExit(GuiGraphics g, Minecraft mc) {
        if (!active) return;
        Screen s = mc.screen; if (s != null && isJoin(mc, s)) return;
        if (!RiftConfig.get().joinAnim || mc.player == null || mc.level == null) { active = false; exiting = false; return; }
        long now = System.currentTimeMillis(); if (!exiting) { exiting = true; exitAt = now; }
        float k = (now - exitAt) / 750f; if (k >= 1f) { active = false; exiting = false; return; }
        double e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        int W = g.guiWidth(), H = g.guiHeight(), cx = W / 2, cy = H / 2 - 8; double maxR = Math.hypot(W, H) / 2 + 4, r = 36 + (maxR - 36) * e;
        int a = (int) (255 * (1 - Math.max(0, (k - 0.8) / 0.2))), col = RiftDraw.argb(0x07080D, a);
        for (int y = 0; y < H; y++) {
            double dy = y + 0.5 - cy;
            if (Math.abs(dy) >= r) { g.fill(0, y, W, y + 1, col); continue; }
            int dx = (int) Math.sqrt(r * r - dy * dy);
            g.fill(0, y, cx - dx, y + 1, col); g.fill(cx + dx, y, W, y + 1, col);
        }
        float sa = Math.max(0f, 1f - k / 0.4f);
        if (sa > 0) star(g, cx, cy, 34 * (1 + k * 1.5), RiftDraw.argb(0xFFFFFF, (int) (255 * sa)));
    }
}
