package de.rift.mod;

import net.minecraft.client.Minecraft;

import java.nio.file.Files;
import java.nio.file.StandardOpenOption;

/** Diagnose: letzter Fehler und Status, wird im Rift-Menue angezeigt. */
public final class RiftLog {
    public static volatile String last = "";
    public static volatile String cloud = "Cloud: noch keine Antwort";
    public static volatile int hudFrames = 0;
    public static volatile int ticks = 0;
    private RiftLog() {}
    public static void err(String s) {
        if (s == null || s.equals(last)) return; last = s;
        try { Files.writeString(Minecraft.getInstance().gameDirectory.toPath().resolve("config").resolve("rift-debug.log"), java.time.LocalTime.now() + " " + s + "\n", StandardOpenOption.CREATE, StandardOpenOption.APPEND); } catch (Throwable ignored) {}
    }
}
