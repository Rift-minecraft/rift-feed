package de.rift.mod.ui;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.client.Minecraft;

import java.nio.file.Files;
import java.nio.file.Path;

/** Einfache Statistik: Spielzeit und Tode (gesamt + Sitzung), gespeichert in config/rift-stats.json. */
public final class RiftStats {
    public static int deaths;
    public static final long START = System.currentTimeMillis();
    private static long baseMs; private static int baseDeaths; private static boolean loaded;
    private RiftStats() {}

    private static Path file() { return Minecraft.getInstance().gameDirectory.toPath().resolve("config").resolve("rift-stats.json"); }
    private static void load() {
        if (loaded) return; loaded = true;
        try { Path f = file(); if (Files.exists(f)) { JsonObject o = JsonParser.parseString(Files.readString(f)).getAsJsonObject(); baseMs = o.get("ms").getAsLong(); baseDeaths = o.get("deaths").getAsInt(); } } catch (Throwable ignored) {}
    }
    public static long totalMs() { load(); return baseMs + (System.currentTimeMillis() - START); }
    public static int totalDeaths() { load(); return baseDeaths + deaths; }
    public static void save() {
        try { load(); JsonObject o = new JsonObject(); o.addProperty("ms", totalMs()); o.addProperty("deaths", totalDeaths()); Files.createDirectories(file().getParent()); Files.writeString(file(), o.toString()); } catch (Throwable ignored) {}
    }
}
