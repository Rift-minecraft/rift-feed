package de.rift.mod.ui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;

public final class RiftHud {
    private RiftHud() {}

    public static void render(GuiGraphics g) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.options.hideGui || mc.screen instanceof RiftMenuScreen) return;
        RiftConfig c = RiftConfig.get(); int w = g.guiWidth(), h = g.guiHeight();
        for (RiftWidgets.Def d : RiftWidgets.ALL) {
            RiftConfig.W wc = c.widgets.get(d.id()); if (wc == null || !wc.on) continue;
            try { d.drawer().draw(g, mc, Math.round(wc.x * w), Math.round(wc.y * h)); } catch (Throwable ignored) {}
        }
        try { RiftMarkers.drawWorld(g, mc); } catch (Throwable ignored) {}
    }
}
