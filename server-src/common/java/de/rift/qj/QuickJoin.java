package de.rift.qj;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;
import java.util.zip.GZIPOutputStream;

/** Rift Quick Join (Server): haengt die Mod-Liste unsichtbar an die normale Server-Antwort der Serverliste an. Der Rift Launcher liest sie ohne Beitritt. */
public final class QuickJoin {
    public static final String PREFIX = "rift-qj:1:";
    /** Wird vom Loader-Einstieg gesetzt (Fabric/NeoForge). */
    public static Supplier<List<Entry>> LISTER = () -> new ArrayList<>();
    public static String LOADER = "fabric", LOADER_VERSION = "", MC = "";
    private static volatile String cached;

    public record Entry(String id, String name, String version, Path file) {}

    private QuickJoin() {}

    public static synchronized String payload() {
        if (cached != null) return cached;
        try {
            JsonObject o = new JsonObject();
            o.addProperty("v", 1); o.addProperty("mc", MC); o.addProperty("loader", LOADER); o.addProperty("lv", LOADER_VERSION);
            JsonArray arr = new JsonArray(); Set<Path> seen = new HashSet<>();
            for (Entry e : LISTER.get()) {
                if (e.file() == null || !seen.add(e.file())) continue;
                String h = sha1(e.file()); if (h == null) continue;
                JsonObject m = new JsonObject(); m.addProperty("i", e.id()); m.addProperty("n", e.name()); m.addProperty("v", e.version()); m.addProperty("h", h);
                arr.add(m);
            }
            o.add("mods", arr);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            try (GZIPOutputStream gz = new GZIPOutputStream(bo)) { gz.write(o.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
            cached = PREFIX + Base64.getEncoder().withoutPadding().encodeToString(bo.toByteArray());
        } catch (Throwable t) { cached = ""; }
        return cached;
    }

    private static String sha1(Path p) {
        try {
            if (!Files.isRegularFile(p) || !p.getFileName().toString().toLowerCase().endsWith(".jar")) return null;
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            try (InputStream in = Files.newInputStream(p)) { byte[] b = new byte[65536]; int n; while ((n = in.read(b)) > 0) md.update(b, 0, n); }
            StringBuilder sb = new StringBuilder(); for (byte x : md.digest()) sb.append(String.format("%02x", x));
            return sb.toString();
        } catch (Throwable t) { return null; }
    }
}
