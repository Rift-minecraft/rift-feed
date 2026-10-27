package de.rift.mod.ui;

import com.google.gson.*;
import net.fabricmc.loader.api.FabricLoader;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/** Einstellungen des Rift-Menüs (config/rift-client.json). */
public final class RiftConfig {
    public static final class W { public boolean on; public float x, y; }

    public Map<String, W> widgets = new LinkedHashMap<>();
    public int rounding = 4;          // Eckenrundung 0..8
    public int alpha = 150;           // Hintergrund-Transparenz 0..255
    public int accent = 0x7DD3FC;
    public boolean shadow = true;
    public boolean markerOn = true;
    public int markerMouse = 2;       // GLFW-Maustaste (2 = Mausrad-Klick), -1 = aus
    public int markerKey = -1;        // alternativ Taste (GLFW-Code), -1 = keine
    public int markerSeconds = 90;
    public int menuKey = 344;         // Rechts-Shift

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
            if (I.widgets.isEmpty()) {   // Standard-Widgets
                def("fps", 0.01f, 0.02f); def("coords", 0.01f, 0.07f); def("direction", 0.36f, 0.01f);
            }
        }
        return I;
    }
    private static void def(String id, float x, float y) { W w = new W(); w.on = true; w.x = x; w.y = y; I.widgets.put(id, w); }
    public W w(String id) {
        return widgets.computeIfAbsent(id, k -> { W w = new W(); w.x = 0.02f; w.y = 0.3f; return w; });
    }
    public void save() { try { Files.writeString(path(), G.toJson(this)); } catch (Throwable ignored) {} }
    private static Path path() { return FabricLoader.getInstance().getConfigDir().resolve("rift-client.json"); }
}
