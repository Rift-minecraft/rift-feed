package de.rift.mod.ui;

import de.rift.mod.RiftLog;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;

public final class RiftHud {
    private RiftHud() {}

    public static void render(GuiGraphics g) {
        RiftLog.hudFrames++;
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.options.hideGui || mc.screen instanceof RiftMenuScreen) return;
        RiftConfig c = RiftConfig.get(); int w = g.guiWidth(), h = g.guiHeight();
        for (RiftWidgets.Def d : RiftWidgets.ALL) {
            RiftConfig.W wc = c.widgets.get(d.id()); if (wc == null || !wc.on || d.id().equals("bossbar")) continue;
            try {
                float s = wc.s <= 0 ? 1f : wc.s;
                g.pose().pushMatrix(); g.pose().translate(Math.round(wc.x * w), Math.round(wc.y * h)); g.pose().scale(s, s);
                try { d.drawer().draw(g, mc, 0, 0); } finally { g.pose().popMatrix(); }
            } catch (Throwable t) { RiftLog.err("Widget " + d.id() + ": " + t); }
        }
        try { RiftMarkers.drawWorld(g, mc); } catch (Throwable t) { RiftLog.err("Marker: " + t); }
    }
}
