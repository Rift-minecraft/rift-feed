package de.rift.mod.ui;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.DoubleConsumer;
import de.rift.mod.RiftEmotes;
import de.rift.mod.RiftCatalog;
import de.rift.mod.RiftLog;

/** Rift-Menü im Spiel: Widget-Editor (Liste links, Vorschau rechts), Design, Marker. */
public class RiftMenuScreen extends Screen {
    private static final String[] TABS = {"Widgets", "Design", "Marker", "Emotes", "Cosmetics"};
    private static final int[] SWATCH = {0x7DD3FC, 0x4ADE80, 0xFBBF24, 0xF87171, 0xC084FC, 0xFFFFFF};

    private record Hit(int x1, int y1, int x2, int y2, Runnable click, DoubleConsumer drag) {}
    private final List<Hit> hits = new ArrayList<>();
    private int tab = 0, scroll = 0;
    private String selected = "fps", dragId = null;
    private double offX, offY;
    private DoubleConsumer activeDrag;
    private boolean capturing = false;
    private int pvX, pvY, pvW, pvH; private float pvS;
    private final Map<String, int[]> rects = new HashMap<>();
    private long openAt = System.currentTimeMillis();
    private boolean released = false;
    private net.minecraft.client.gui.components.EditBox nameBox;
    private static final String[] MICONS = {"\u2666", "\u2605", "\u2691", "\u2620", "\u2665"};

    @Override protected void init() {
        RiftConfig c = RiftConfig.get();
        nameBox = new net.minecraft.client.gui.components.EditBox(this.font, 0, 0, 160, 16, Component.literal("Name"));
        nameBox.setMaxLength(24); nameBox.setValue(c.privateName == null ? "" : c.privateName);
        nameBox.setResponder(v -> { c.privateName = v; c.save(); });
        this.addWidget(nameBox);
    }

    public RiftMenuScreen() { super(Component.literal("Rift")); }

    @Override public boolean isPauseScreen() { return false; }
    

    private void hit(int x1, int y1, int x2, int y2, Runnable c) { hits.add(new Hit(x1, y1, x2, y2, c, null)); }

    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        hits.clear(); RiftConfig c = RiftConfig.get();
        float a = Math.min(1f, (System.currentTimeMillis() - openAt) / 180f);
        if (GLFW.glfwGetKey(net.minecraft.client.Minecraft.getInstance().getWindow().handle(), c.menuKey) == GLFW.GLFW_RELEASE) released = true;
        // grosse Box um alles (leicht durchsichtig, dahinter unscharf)
        RiftDraw.round(g, 6, 6, width - 6, height - 6, 8, RiftDraw.argb(0x07080D, (int) (150 * a)));
        // Tabs
        int tw = 74, tx = width / 2 - TABS.length * tw / 2;
        RiftDraw.text(g, "RIFT", 18, 14, c.accent);
        for (int i = 0; i < TABS.length; i++) {
            int x = tx + i * tw, i2 = i; boolean on = tab == i, hov = mx >= x && mx < x + tw && my >= 8 && my < 28;
            RiftDraw.text(g, TABS[i], x + (tw - RiftDraw.width(TABS[i])) / 2, 14, on ? c.accent : hov ? 0xFFFFFF : 0x9CA3AF);
            if (on) g.fill(x + 10, 26, x + tw - 10, 28, 0xFF000000 | c.accent);
            hit(x, 8, x + tw, 30, () -> { tab = i2; });
        }
        nameBox.visible = false;
        if (tab == 0) widgetsTab(g, mx, my, c);
        else if (tab == 1) designTab(g, mx, my, c);
        else if (tab == 2) markerTab(g, mx, my, c);
        else if (tab == 3) emoteTab(g, mx, my, c);
        else cosTab(g, mx, my, c);
        { String st = de.rift.mod.RiftLog.last.isEmpty() ? "Rift-Mod \u00b7 HUD-Frames: " + de.rift.mod.RiftLog.hudFrames : "Fehler: " + de.rift.mod.RiftLog.last;
          RiftDraw.text(g, trunc(st, width - 330), 14, height - 32, de.rift.mod.RiftLog.last.isEmpty() ? 0x6B7280 : 0xF87171); }
        RiftDraw.text(g, "R oder Esc: schließen", 14, height - 20, 0x9CA3AF);
        int bw = 128, bx = width - bw - 14, by = height - 24; boolean bh = mx >= bx && mx < bx + bw && my >= by && my < by + 16;
        RiftDraw.round(g, bx, by, bx + bw, by + 16, 4, bh ? RiftDraw.argb(c.accent, 110) : 0x40FFFFFF);
        RiftDraw.text(g, "\u2039 Zurück zum Spielmenü", bx + (bw - RiftDraw.width("\u2039 Zurück zum Spielmenü")) / 2, by + 4, 0xFFFFFF);
        hit(bx, by, bx + bw, by + 16, () -> net.minecraft.client.Minecraft.getInstance().setScreen(new net.minecraft.client.gui.screens.PauseScreen(true)));
    }

    /* ---------------- Widgets ---------------- */
    private void widgetsTab(GuiGraphics g, int mx, int my, RiftConfig c) {
        int lx = 16, ly = 38, lw = 150, lh = height - 70;
        RiftDraw.round(g, lx, ly, lx + lw, ly + lh, 5, RiftDraw.argb(0x0B0B10, 120));
        RiftDraw.text(g, "Widgets", lx + 8, ly + 6, 0xFFFFFF);
        g.enableScissor(lx, ly + 20, lx + lw, ly + lh - 2);
        int y = ly + 22 - scroll; String grp = "";
        for (RiftWidgets.Def d : RiftWidgets.ALL) {
            if (!d.group().equals(grp)) { grp = d.group(); RiftDraw.text(g, grp, lx + 8, y + 2, 0x6B7280); y += 13; }
            RiftConfig.W w = c.w(d.id()); boolean sel = d.id().equals(selected);
            boolean hov = mx >= lx + 4 && mx < lx + lw - 4 && my >= y && my < y + 17;
            RiftDraw.round(g, lx + 4, y, lx + lw - 4, y + 17, 3, sel ? RiftDraw.argb(c.accent, 70) : hov ? 0x33FFFFFF : 0x1AFFFFFF);
            RiftDraw.text(g, d.name(), lx + 9, y + 5, 0xFFFFFF);
            int sx = lx + lw - 24; RiftDraw.round(g, sx, y + 5, sx + 14, y + 12, 3, w.on ? RiftDraw.argb(c.accent, 255) : 0x55FFFFFF);
            g.fill(w.on ? sx + 9 : sx + 1, y + 6, w.on ? sx + 13 : sx + 5, y + 11, 0xFFFFFFFF);
            if (my > ly + 20 && my < ly + lh - 2) {
                String id = d.id(); hit(lx + 4, y, lx + lw - 4, y + 17, () -> { RiftConfig.W ww = c.w(id); if (id.equals(selected)) ww.on = !ww.on; else { selected = id; ww.on = true; } c.save(); });
            }
            y += 19;
        }
        g.disableScissor();
        maxScroll = Math.max(0, y + scroll - (ly + lh));
        // Vorschau
        int ax = lx + lw + 12, ay = 38, aw = width - ax - 18, ah = height - 104;
        float s = Math.min(aw / (float) width, ah / (float) height); pvS = s; pvW = Math.round(width * s); pvH = Math.round(height * s);
        pvX = ax + (aw - pvW) / 2; pvY = ay + (ah - pvH) / 2;
        wood(g, pvX, pvY, pvX + pvW, pvY + pvH, 6);
        g.fillGradient(pvX, pvY, pvX + pvW, pvY + pvH * 2 / 3, 0xFF5E9BE0, 0xFFBFE0F7); g.fill(pvX, pvY + pvH * 2 / 3, pvX + pvW, pvY + pvH * 2 / 3 + Math.max(2, pvH / 14), 0xFF5DA34A); g.fill(pvX, pvY + pvH * 2 / 3 + Math.max(2, pvH / 14), pvX + pvW, pvY + pvH, 0xFF7A5230);
        g.fill(pvX + pvW - pvW / 6, pvY + pvH / 10, pvX + pvW - pvW / 6 + Math.max(6, pvW / 24), pvY + pvH / 10 + Math.max(6, pvW / 24), 0xFFFFF3A0);
        g.enableScissor(pvX, pvY, pvX + pvW, pvY + pvH);
        g.pose().pushMatrix(); g.pose().translate((float) pvX, (float) pvY); g.pose().scale(s, s);
        mockHud(g);
        rects.clear(); var mc = net.minecraft.client.Minecraft.getInstance();
        for (RiftWidgets.Def d : RiftWidgets.ALL) {
            RiftConfig.W w = c.w(d.id()); if (!w.on) continue;
            int px = Math.round(w.x * width), py = Math.round(w.y * height);
            float ws = w.s <= 0 ? 1f : w.s; int[] sz;
            g.pose().pushMatrix(); g.pose().translate((float) px, (float) py); g.pose().scale(ws, ws);
            try { sz = d.drawer().draw(g, mc, 0, 0); } catch (Throwable t) { sz = new int[]{40, 14}; de.rift.mod.RiftLog.err("Widget " + d.id() + ": " + t); } finally { g.pose().popMatrix(); }
            sz = new int[]{Math.round(sz[0] * ws), Math.round(sz[1] * ws)};
            rects.put(d.id(), new int[]{px, py, sz[0], sz[1]});
            if (d.id().equals(selected)) outline(g, px - 1, py - 1, px + sz[0] + 1, py + sz[1] + 1, 0xFF000000 | c.accent);
        }
        g.pose().popMatrix(); g.disableScissor();
        RiftDraw.text(g, "Widget links antippen, dann in der Vorschau ziehen", pvX, pvY + pvH + 10, 0x9CA3AF);
        { RiftConfig.W sw = c.w(selected); int bx = pvX + Math.max(0, pvW - 150); slider(g, bx, pvY + pvH + 22, 150, "Gr\u00f6\u00dfe", Math.round((sw.s <= 0 ? 1f : sw.s) * 100), 50, 250, v -> { sw.s = (float) (Math.round(v / 5.0) * 5) / 100f; }); }
    }
    private int maxScroll = 0;

    private void mockHud(GuiGraphics g) {
        int hx = width / 2 - 91, hy = height - 22;
        RiftDraw.round(g, hx, hy, hx + 182, hy + 22, 2, 0xAA111111);
        for (int i = 0; i < 9; i++) g.fill(hx + 3 + i * 20, hy + 3, hx + 21 + i * 20, hy + 19, i == 3 ? 0x88FFFFFF : 0x44000000);
        for (int i = 0; i < 10; i++) g.fill(hx + i * 8, hy - 11, hx + i * 8 + 7, hy - 4, 0xFFDC2626);
        g.fill(width / 2 - 1, height / 2 - 5, width / 2 + 1, height / 2 + 5, 0xCCFFFFFF); g.fill(width / 2 - 5, height / 2 - 1, width / 2 + 5, height / 2 + 1, 0xCCFFFFFF);
    }
    private static void outline(GuiGraphics g, int x1, int y1, int x2, int y2, int col) {
        g.fill(x1, y1, x2, y1 + 1, col); g.fill(x1, y2 - 1, x2, y2, col); g.fill(x1, y1, x1 + 1, y2, col); g.fill(x2 - 1, y1, x2, y2, col);
    }

    /* ---------------- Design ---------------- */
    private void designTab(GuiGraphics g, int mx, int my, RiftConfig c) {
        int x = width / 2 - 130, y = 50;
        RiftDraw.round(g, x - 12, y - 12, x + 262, y + 212, 6, RiftDraw.argb(0x0B0B10, 120));
        RiftDraw.text(g, "Design", x, y, 0xFFFFFF); y += 18;
        slider(g, x, y, 220, "Eckenrundung", c.rounding, 0, 8, v -> { c.rounding = (int) Math.round(v); }); y += 30;
        slider(g, x, y, 220, "Transparenz (Hintergrund)", c.alpha, 20, 255, v -> { c.alpha = (int) Math.round(v); }); y += 30;
        toggle(g, x, y, "Text-Schatten", c.shadow, () -> { c.shadow = !c.shadow; c.save(); }); y += 20;
        toggle(g, x, y, "Rift-Schrift (Beta, aus = Minecraft)", c.riftFont, () -> { c.riftFont = !c.riftFont; c.save(); }); y += 22;
        RiftDraw.text(g, "Akzentfarbe", x, y, 0x9CA3AF); y += 12;
        for (int i = 0; i < SWATCH.length; i++) { int sx = x + i * 24, col = SWATCH[i]; RiftDraw.round(g, sx, y, sx + 18, y + 18, 4, 0xFF000000 | col); if (c.accent == col) outline(g, sx - 2, y - 2, sx + 20, y + 20, 0xFFFFFFFF); hit(sx, y, sx + 18, y + 18, () -> { c.accent = col; c.save(); }); }
        y += 30;
        RiftDraw.text(g, "Vorschau", x, y, 0x9CA3AF);
        RiftWidgets.find("fps").drawer().draw(g, net.minecraft.client.Minecraft.getInstance(), x, y + 12);
        RiftWidgets.find("coords").drawer().draw(g, net.minecraft.client.Minecraft.getInstance(), x + 70, y + 12);
    }

    /* ---------------- Marker ---------------- */
    private void markerTab(GuiGraphics g, int mx, int my, RiftConfig c) {
        int x = width / 2 - 130, y = 50;
        RiftDraw.round(g, x - 12, y - 12, x + 262, y + 290, 6, RiftDraw.argb(0x0B0B10, 120));
        RiftDraw.text(g, "Marker", x, y, 0xFFFFFF); y += 18;
        toggle(g, x, y, "Marker aktiv", c.markerOn, () -> { c.markerOn = !c.markerOn; c.save(); }); y += 24;
        RiftDraw.text(g, "Taste zum Markieren", x, y, 0x9CA3AF); y += 12;
        String label = capturing ? "Drücke eine Taste oder Maustaste…" : bindName(c);
        RiftDraw.round(g, x, y, x + 220, y + 18, 4, capturing ? RiftDraw.argb(c.accent, 90) : 0x33FFFFFF); RiftDraw.text(g, label, x + 8, y + 5, 0xFFFFFF);
        hit(x, y, x + 220, y + 18, () -> capturing = true); y += 28;
        slider(g, x, y, 220, "Dauer (Sekunden)", c.markerSeconds, 10, 300, v -> { c.markerSeconds = (int) Math.round(v); }); y += 30;
        y += RiftDraw.wrap(g, "Mausrad: Marker f\u00fcr alle Rift-Spieler (mit Kopf). Strg + Mausrad: privater Marker, nur f\u00fcr dich. Taste dr\u00fccken, wenn du weniger als 10 Bl\u00f6cke vom eigenen Marker entfernt bist: bearbeiten.", x, y, 240, 0x6B7280) + 6;
        RiftDraw.text(g, "Privater Marker: Name", x, y, 0x9CA3AF); y += 12;
        nameBox.setX(x); nameBox.setY(y); nameBox.visible = true; nameBox.render(g, mx, my, 0f); y += 24;
        RiftDraw.text(g, "Privater Marker: Symbol", x, y, 0x9CA3AF); y += 12;
        for (int i = 0; i < MICONS.length; i++) {
            int sx = x + i * 28, ii = i; boolean on = c.privateIcon == i;
            RiftDraw.round(g, sx, y, sx + 22, y + 18, 4, on ? RiftDraw.argb(c.accent, 160) : 0x33FFFFFF);
            RiftDraw.text(g, MICONS[i], sx + 11 - RiftDraw.width(MICONS[i]) / 2, y + 5, 0xFFFFFF);
            hit(sx, y, sx + 22, y + 18, () -> { c.privateIcon = ii; c.save(); });
        }
    }
    private String bindName(RiftConfig c) {
        if (c.markerKey > 0) { String n = GLFW.glfwGetKeyName(c.markerKey, 0); return "Taste: " + (n == null ? String.valueOf(c.markerKey) : n.toUpperCase()); }
        return c.markerMouse == 2 ? "Mausrad-Klick" : c.markerMouse >= 0 ? "Maustaste " + (c.markerMouse + 1) : "Aus";
    }

    /* ---------------- Cosmetics ---------------- */
    private void cosTab(GuiGraphics g, int mx, int my, RiftConfig c) {
        var mc = net.minecraft.client.Minecraft.getInstance();
        int fw = Math.min(170, width / 3), fh = Math.min(height - 90, 230), fx = width / 2 - fw - 20, fy = 50;
        wood(g, fx, fy, fx + fw, fy + fh, 6);
        g.fillGradient(fx, fy, fx + fw, fy + fh, 0xFF1B2433, 0xFF3A4A63);
        try { net.minecraft.client.gui.screens.inventory.InventoryScreen.renderEntityInInventoryFollowsMouse(g, fx, fy + 14, fx + fw, fy + fh, Math.max(30, fh / 3), 0.0625f, (float) mx, (float) my, mc.player); } catch (Throwable ignored) {}
        if (mc.player != null) {
            net.minecraft.network.chat.Component n = de.rift.mod.RiftCosmetics.nameFor(mc.player.getUUID(), mc.player.getName());
            if (n == null) n = mc.player.getName();
            int w = mc.font.width(n); RiftDraw.round(g, fx + fw / 2 - w / 2 - 4, fy + 3, fx + fw / 2 + w / 2 + 4, fy + 15, 3, 0x66000000);
            g.drawString(mc.font, n, fx + fw / 2 - w / 2, fy + 5, 0xFFFFFFFF, true);
        }
        int x = fx + fw + 24, py = fy - 6, pw = Math.min(260, width - x - 16), ph = Math.max(120, height - py - 50);
        RiftDraw.round(g, x - 10, py, x + pw, py + ph, 6, RiftDraw.argb(0x0B0B10, 120));
        if (RiftCatalog.ITEMS.isEmpty() && RiftCatalog.status.isEmpty()) RiftCatalog.load();
        String[][] types = {{"nametag", "Nametag"}, {"cape", "Cape"}, {"aura", "Aura"}, {"pet", "Pet"}};
        int cx = x;
        for (String[] t : types) {
            int w = RiftDraw.width(t[1]) + 14; boolean on = cosType.equals(t[0]);
            RiftDraw.round(g, cx, py + 6, cx + w, py + 22, 5, on ? RiftDraw.argb(c.accent, 160) : 0x33FFFFFF);
            RiftDraw.text(g, t[1], cx + 7, py + 11, 0xFFFFFF); String tt = t[0]; hit(cx, py + 6, cx + w, py + 22, () -> { cosType = tt; cosScroll = 0; });
            cx += w + 4;
        }
        int ly = py + 28, lh = ph - 52; java.util.List<RiftCatalog.Item> list = RiftCatalog.of(cosType);
        g.enableScissor(x - 6, ly, x + pw - 4, ly + lh);
        int yy = ly - cosScroll; String cur = RiftCatalog.EQUIPPED.get(cosType);
        yy = row(g, mx, my, x, yy, pw - 18, "Keine Auswahl", 0x9CA3AF, cur == null, ly, lh, () -> RiftCatalog.equip(cosType, null));
        for (RiftCatalog.Item it : list) yy = row(g, mx, my, x, yy, pw - 18, it.name == null ? it.id : it.name, rarityCol(it.rarity), it.id.equals(cur), ly, lh, () -> RiftCatalog.equip(it.type, it.id));
        g.disableScissor();
        cosMax = Math.max(0, yy + cosScroll - (ly + lh));
        String st = RiftCatalog.status.isEmpty() ? RiftLog.cloud : RiftCatalog.status;
        RiftDraw.text(g, trunc(st, pw), x, py + ph - 14, 0x7DD3FC);
    }
    private int cosScroll = 0, cosMax = 0; private String cosType = "nametag";
    private int row(GuiGraphics g, int mx, int my, int x, int y, int w, String name, int col, boolean on, int ly, int lh, Runnable click) {
        boolean hov = mx >= x - 6 && mx < x + w && my >= y && my < y + 18 && my >= ly && my < ly + lh;
        RiftDraw.round(g, x - 6, y, x + w, y + 18, 4, on ? RiftDraw.argb(RiftConfig.get().accent, 130) : hov ? 0x33FFFFFF : 0x1AFFFFFF);
        g.fill(x - 2, y + 5, x + 2, y + 13, 0xFF000000 | col);
        RiftDraw.text(g, trunc(name, w - 40), x + 8, y + 5, 0xFFFFFF);
        if (on) RiftDraw.text(g, "\u2713", x + w - 14, y + 5, 0xFFFFFF);
        if (y + 18 > ly && y < ly + lh) hit(x - 6, Math.max(y, ly), x + w, Math.min(y + 18, ly + lh), click);
        return y + 20;
    }
    private static int rarityCol(String r) {
        if (r == null) return 0x9CA3AF;
        return switch (r) { case "rare" -> 0x60A5FA; case "epic" -> 0xC084FC; case "legendary" -> 0xFBBF24; case "mythic" -> 0xF9A8D4; case "plus" -> 0x22C55E; case "event" -> 0xFB923C; case "secret" -> 0xF87171; default -> 0xE5E7EB; };
    }

    /* ---------------- Emotes ---------------- */
    private void emoteTab(GuiGraphics g, int mx, int my, RiftConfig c) {
        int x = width / 2 - 150, y = 50;
        RiftDraw.round(g, x - 12, y - 12, x + 312, y + 60 + ((RiftEmotes.owned().size() + 1) / 2) * 24, 6, RiftDraw.argb(0x0B0B10, 120));
        RiftDraw.text(g, "Emote-Rad (Taste B)", x, y, 0xFFFFFF); y += 14;
        y += RiftDraw.wrap(g, "Klicke Emotes an, um sie ins Rad zu legen oder zu entfernen (max. 8). Neue Emotes gibt es im Launcher.", x, y, 310, 0x9CA3AF) + 4;
        java.util.List<String> wl = new java.util.ArrayList<>(RiftEmotes.wheel()); int i = 0;
        for (String id : RiftEmotes.owned()) {
            int cx = x + (i % 2) * 160, cy = y + (i / 2) * 24; i++; boolean on = wl.contains(id);
            RiftDraw.round(g, cx, cy, cx + 150, cy + 20, 5, on ? RiftDraw.argb(c.accent, 150) : 0x33FFFFFF);
            RiftDraw.text(g, RiftEmotes.NAMES.getOrDefault(id, id), cx + 8, cy + 6, 0xFFFFFF);
            if (on) RiftDraw.text(g, "\u2713", cx + 134, cy + 6, 0xFFFFFF);
            hit(cx, cy, cx + 150, cy + 20, () -> { java.util.List<String> w2 = new java.util.ArrayList<>(RiftEmotes.wheel()); if (!w2.remove(id)) { if (w2.size() >= 8) return; w2.add(id); } c.wheel = w2; c.save(); });
        }
    }
    private static String trunc(String s, int px) { while (s.length() > 4 && RiftDraw.width(s) > px) s = s.substring(0, s.length() - 2); return s; }

    /** Rahmen aus Eichenholz um einen Bereich. */
    private static void wood(GuiGraphics g, int x1, int y1, int x2, int y2, int t) {
        int ox1 = x1 - t, oy1 = y1 - t, ox2 = x2 + t, oy2 = y2 + t;
        g.fill(ox1, oy1, ox2, oy2, 0xFFB08A52);
        for (int x = ox1 + 9; x < ox2; x += 17) { g.fill(x, oy1, x + 1, y1, 0xFF8A6A3A); g.fill(x + 6, oy2 - t, x + 7, oy2, 0xFF8A6A3A); }
        for (int y = oy1 + 9; y < oy2; y += 17) { g.fill(ox1, y, x1, y + 1, 0xFF8A6A3A); g.fill(ox2 - t, y + 6, ox2, y + 7, 0xFF8A6A3A); }
        g.fill(ox1, oy1, ox2, oy1 + 1, 0xFFD2AE74); g.fill(ox1, oy1, ox1 + 1, oy2, 0xFFD2AE74);
        g.fill(ox1, oy2 - 1, ox2, oy2, 0xFF5A3F1C); g.fill(ox2 - 1, oy1, ox2, oy2, 0xFF5A3F1C);
        g.fill(x1 - 1, y1 - 1, x2 + 1, y1, 0xFF4A3519); g.fill(x1 - 1, y1 - 1, x1, y2 + 1, 0xFF4A3519);
    }

    /* ---------------- Bausteine ---------------- */
    private void toggle(GuiGraphics g, int x, int y, String label, boolean on, Runnable r) {
        RiftConfig c = RiftConfig.get();
        RiftDraw.round(g, x, y, x + 26, y + 13, 6, on ? RiftDraw.argb(c.accent, 255) : 0x55FFFFFF);
        g.fill(on ? x + 15 : x + 2, y + 2, on ? x + 24 : x + 11, y + 11, 0xFFFFFFFF);
        RiftDraw.text(g, label, x + 34, y + 3, 0xFFFFFF); hit(x, y, x + 200, y + 13, r);
    }
    private void slider(GuiGraphics g, int x, int y, int w, String label, double val, double min, double max, DoubleConsumer set) {
        RiftConfig c = RiftConfig.get();
        RiftDraw.text(g, label, x, y, 0x9CA3AF); RiftDraw.text(g, String.valueOf((int) Math.round(val)), x + w - RiftDraw.width(String.valueOf((int) Math.round(val))), y, 0xFFFFFF);
        int by = y + 13; RiftDraw.round(g, x, by, x + w, by + 6, 3, 0x44FFFFFF);
        int fw = (int) ((val - min) / (max - min) * w); RiftDraw.round(g, x, by, x + Math.max(6, fw), by + 6, 3, 0xFF000000 | c.accent);
        RiftDraw.round(g, x + fw - 3, by - 2, x + fw + 3, by + 8, 3, 0xFFFFFFFF);
        hits.add(new Hit(x - 4, y, x + w + 4, by + 10, null, mxv -> { set.accept(min + Math.max(0, Math.min(1, (mxv - x) / w)) * (max - min)); }));
    }

    /* ---------------- Eingaben ---------------- */
    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean dbl) {
        double mx = e.x(), my = e.y(); int btn = e.button();
        if (capturing) { RiftConfig c = RiftConfig.get(); c.markerMouse = btn; c.markerKey = -1; c.save(); capturing = false; return true; }
        if (btn != 0) return super.mouseClicked(e, dbl);
        for (int i = hits.size() - 1; i >= 0; i--) {
            Hit h = hits.get(i);
            if (mx >= h.x1 && mx < h.x2 && my >= h.y1 && my < h.y2) {
                if (h.drag != null) { activeDrag = h.drag; h.drag.accept(mx); return true; }
                if (h.click != null) { h.click.run(); return true; }
            }
        }
        if (tab == 0 && mx >= pvX && mx < pvX + pvW && my >= pvY && my < pvY + pvH) {
            double gx = (mx - pvX) / pvS, gy = (my - pvY) / pvS;
            List<String> ids = new ArrayList<>(rects.keySet());
            for (int i = ids.size() - 1; i >= 0; i--) { int[] r = rects.get(ids.get(i)); if (gx >= r[0] && gx < r[0] + r[2] && gy >= r[1] && gy < r[1] + r[3]) { dragId = ids.get(i); selected = dragId; offX = gx - r[0]; offY = gy - r[1]; return true; } }
        }
        return super.mouseClicked(e, dbl);
    }

    @Override
    public boolean mouseDragged(MouseButtonEvent e, double dx, double dy) {
        if (activeDrag != null) { activeDrag.accept(e.x()); return true; }
        if (dragId != null) {
            double gx = (e.x() - pvX) / pvS - offX, gy = (e.y() - pvY) / pvS - offY; int[] r = rects.get(dragId);
            int rw = r == null ? 20 : r[2], rh = r == null ? 12 : r[3];
            RiftConfig.W w = RiftConfig.get().w(dragId);
            w.x = (float) Math.max(0, Math.min(1, Math.min(gx, width - rw) / width)); w.y = (float) Math.max(0, Math.min(1, Math.min(gy, height - rh) / height));
            return true;
        }
        return super.mouseDragged(e, dx, dy);
    }

    @Override
    public boolean mouseReleased(MouseButtonEvent e) {
        if (activeDrag != null || dragId != null) RiftConfig.get().save();
        activeDrag = null; dragId = null; return super.mouseReleased(e);
    }

    @Override
    public boolean mouseScrolled(double x, double y, double sx, double sy) {
        if (tab == 4) { cosScroll = (int) Math.max(0, Math.min(cosMax, cosScroll - sy * 18)); return true; }
        if (tab == 0 && x >= pvX && x < pvX + pvW && y >= pvY && y < pvY + pvH) { RiftConfig.W sw = RiftConfig.get().w(selected); sw.s = Math.max(.5f, Math.min(2.5f, (sw.s <= 0 ? 1f : sw.s) + (float) sy * .1f)); RiftConfig.get().save(); return true; }
        scroll = (int) Math.max(0, Math.min(maxScroll, scroll - sy * 14)); return true;
    }

    @Override
    public boolean keyPressed(KeyEvent e) {
        int k = e.key(); RiftConfig c = RiftConfig.get();
        if (tab == 2 && nameBox != null && nameBox.isFocused() && k != GLFW.GLFW_KEY_ESCAPE) return super.keyPressed(e);
        if (capturing) { if (k != GLFW.GLFW_KEY_ESCAPE) { c.markerKey = k; c.markerMouse = -1; c.save(); } capturing = false; return true; }
        if (k == GLFW.GLFW_KEY_ESCAPE || (k == c.menuKey && released)) { onClose(); return true; }
        if (k == c.menuKey) return true;
        return super.keyPressed(e);
    }
}
