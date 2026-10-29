package de.rift.mod.ui;

import com.google.gson.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/** Einstellungen des Rift-Menüs (config/rift-client.json). */
public final class RiftConfig {
    public static final class W { public boolean on; public float x, y; public float s = 1f; }

    public Map<String, W> widgets = new LinkedHashMap<>();
    public int rounding = 4;          // Eckenrundung 0..8
    public int alpha = 150;           // Hintergrund-Transparenz 0..255
    public int accent = 0x7DD3FC;
    public boolean shadow = true;
    public boolean markerOn = true;
    public int markerMouse = 2;       // GLFW-Maustaste (2 = Mausrad-Klick), -1 = aus
    public int markerKey = -1;        // alternativ Taste (GLFW-Code), -1 = keine
    public int markerSeconds = 90;
    public int menuKey = 82;          // R
    public int ver = 0;
    public boolean joinAnim = true;     // Beitritts-Animation
    public int menuStyle = 1;          // 0 = Vanilla (Holzrahmen), 1 = Rift (runde Ecken)
    public boolean riftFont = false;   // Rift-Schrift (Beta)
    public java.util.List<String> wheel = null;   // eigenes Emote-Rad (sonst das aus dem Launcher)
    public int coordKey = 72;         // H: Koordinaten in den Chat
    public int emoteKey = 66;         // B
    public String privateName = "Marker";
    public int privateIcon = 0;

    private static RiftConfig I;
    private static final Gson G = new GsonBuilder().setPrettyPrinting().create();

    public static RiftConfig get() {
        if (I == null) {
            try {
                Path f = path();
                if (Files.exists(f)) I = G.fromJson(Files.readString(f), RiftConfig.class);
            } catch (Throwable ignored) {}
            if (I == null) I = new RiftConfig();
            if (I.widgets == null) I.widgets = new LinkedHashMap<>();
            if (I.ver < 3) { I.menuKey = 82; for (W w : I.widgets.values()) w.on = false; }
            if (I.ver < 4) { I.ver = 4; I.riftFont = false; }
            if (I.ver < 5) { I.ver = 5; I.menuStyle = 1; }
            if (I.widgets.isEmpty()) {   // Standard-Widgets
                def("fps", 0.01f, 0.02f); def("coords", 0.01f, 0.07f); def("direction", 0.36f, 0.01f); def("bossbar", 0.36f, 0.03f);
            }
        }
        return I;
    }
    private static void def(String id, float x, float y) { W w = new W(); w.on = false; w.x = x; w.y = y; I.widgets.put(id, w); }
    public W w(String id) {
        return widgets.computeIfAbsent(id, k -> { W w = new W(); w.x = 0.02f; w.y = 0.3f; return w; });
    }
    public void save() { try { Files.writeString(path(), G.toJson(this)); } catch (Throwable ignored) {} }
    private static Path path() { return net.minecraft.client.Minecraft.getInstance().gameDirectory.toPath().resolve("config").resolve("rift-client.json"); }
}
