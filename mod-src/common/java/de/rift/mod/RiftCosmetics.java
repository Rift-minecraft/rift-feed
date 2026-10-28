package de.rift.mod;

import com.google.gson.*;
import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.core.ClientAsset;
import net.minecraft.core.particles.ParticleOptions;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.network.chat.Style;
import net.minecraft.network.chat.TextColor;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.player.PlayerSkin;

import java.lang.reflect.Constructor;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/** Holt die Cosmetics aller Spieler aus dem Rift-Worker und wendet sie im Spiel an. */
public final class RiftCosmetics {
    record Data(String kind, int[] colors, String aura, byte[] cape, boolean plus, int plusColor, int sig) {}

    private static final Map<String, Data> DATA = new ConcurrentHashMap<>();
    private static final Map<String, Identifier> CAPES = new ConcurrentHashMap<>();
    private static final Map<String, Identifier[]> FRAMES = new ConcurrentHashMap<>();
    private static final Set<String> ASKED = ConcurrentHashMap.newKeySet();
    private static volatile String api = "";
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();
    private static int tick = 0;
    private static final Random RND = new Random();

    private RiftCosmetics() {}

    public static void start() {
        try {
            Path f = Minecraft.getInstance().gameDirectory.toPath().resolve("config").resolve("rift-cosmetics.json");
            if (Files.exists(f)) {
                JsonObject cfg = JsonParser.parseString(Files.readString(f)).getAsJsonObject();
                api = cfg.get("api").getAsString().replaceAll("/$", "");
                if (cfg.has("emotesOwned")) { List<String> l = new ArrayList<>(); for (JsonElement e : cfg.getAsJsonArray("emotesOwned")) l.add(e.getAsString()); RiftEmotes.OWNED = l; }
                if (cfg.has("emotes")) { List<String> l = new ArrayList<>(); for (JsonElement e : cfg.getAsJsonArray("emotes")) l.add(e.getAsString()); RiftEmotes.MY = l; }
            }
        } catch (Exception ignored) {}
        if (api.isEmpty()) { RiftLog.cloud = "Cloud: keine Adresse (im Launcher Einstellungen → Cloud eintragen)"; return; }
        RiftNet.start(api);
        Thread t = new Thread(() -> {
            while (true) {
                try { Thread.sleep(15000); poll(); } catch (InterruptedException e) { return; } catch (Throwable ignored) {}
            }
        }, "rift-cosmetics");
        t.setDaemon(true); t.start();
    }

    public static String api() { return api; }
    public static void refresh() { try { poll(); } catch (Throwable ignored) {} }

    private static void poll() {
        Minecraft mc = Minecraft.getInstance();
        List<String> ids = new ArrayList<>();
        mc.execute(() -> {
            if (mc.level == null) return;
            for (AbstractClientPlayer p : mc.level.players()) ids.add(hex(p.getUUID()));
            new Thread(() -> fetch(ids), "rift-fetch").start();
        });
    }

    private static void fetch(List<String> ids) {
        if (ids.isEmpty()) return;
        try {
            String q = String.join(",", ids.subList(0, Math.min(50, ids.size())));
            HttpResponse<String> r = HTTP.send(HttpRequest.newBuilder(URI.create(api + "/v1/cosmetics?uuids=" + q)).timeout(Duration.ofSeconds(8)).GET().build(), HttpResponse.BodyHandlers.ofString());
            if (r.statusCode() != 200) { RiftLog.cloud = "Server error"; RiftLog.err("Cloud GET " + r.statusCode() + " " + RiftLog.snip(r.body())); return; }
            JsonObject all = JsonParser.parseString(r.body()).getAsJsonObject();
            Set<String> have = new HashSet<>();
            for (Map.Entry<String, JsonElement> e : all.entrySet()) { parse(e.getKey(), e.getValue().getAsJsonObject()); have.add(e.getKey()); }
            for (String id : ids) if (!have.contains(id)) DATA.remove(id);
            Minecraft m = Minecraft.getInstance(); String me = m.player == null ? "" : hex(m.player.getUUID());
            RiftLog.cloud = "Cloud: OK, " + all.size() + " von " + ids.size() + " Spielern haben Cosmetics; du: " + (have.contains(me) ? "ja" : "NEIN (im Launcher einmal starten/anmelden)");
        } catch (Throwable t) { RiftLog.cloud = "Cloud: Verbindung fehlgeschlagen (" + t.getClass().getSimpleName() + ")"; }
    }

    private static void parse(String id, JsonObject o) {
        String kind = "solid"; int[] cols = new int[0]; String aura = null; byte[] cape = null;
        if (o.has("nametag") && o.get("nametag").isJsonObject()) {
            JsonObject n = o.getAsJsonObject("nametag");
            kind = n.has("kind") ? n.get("kind").getAsString() : "solid";
            if (n.has("colors")) { JsonArray a = n.getAsJsonArray("colors"); cols = new int[a.size()]; for (int i = 0; i < cols.length; i++) cols[i] = rgb(a.get(i).getAsString()); }
        } else kind = "none";
        if (o.has("aura") && !o.get("aura").isJsonNull()) aura = o.get("aura").getAsString();
        if (o.has("capePng") && !o.get("capePng").isJsonNull()) {
            String s = o.get("capePng").getAsString(); int c = s.indexOf(',');
            if (c > 0) try { cape = Base64.getDecoder().decode(s.substring(c + 1)); } catch (Exception ignored) {}
        }
        Data old = DATA.get(id);
        boolean plus = o.has("plus") && !o.get("plus").isJsonNull() && o.get("plus").getAsBoolean();
        int pc = o.has("plusColor") && !o.get("plusColor").isJsonNull() ? rgb(o.get("plusColor").getAsString()) : 0x22C55E;
        List<byte[]> frames = new ArrayList<>(); int sig = 0;
        if (o.has("capeFrames") && o.get("capeFrames").isJsonArray()) {
            for (JsonElement fe : o.getAsJsonArray("capeFrames")) {
                String fs = fe.getAsString(); int c = fs.indexOf(',');
                if (c > 0) try { byte[] b = Base64.getDecoder().decode(fs.substring(c + 1)); frames.add(b); sig = sig * 31 + Arrays.hashCode(b); } catch (Exception ignored) {}
            }
        }
        Data d = new Data(kind, cols, aura, cape, plus, pc, sig);
        DATA.put(id, d);
        if (frames.size() > 1) { if (old == null || old.sig() != sig) registerFrames(id, frames); }
        else {
            FRAMES.remove(id);
            if (cape != null && (old == null || !Arrays.equals(old.cape(), cape) || old.sig() != 0)) registerCape(id, cape);
            else if (cape == null) CAPES.remove(id);
        }
    }

    private static void registerCape(String id, byte[] png) {
        Minecraft mc = Minecraft.getInstance();
        mc.execute(() -> {
            try {
                NativeImage img = NativeImage.read(new java.io.ByteArrayInputStream(png));
                Identifier rl = Identifier.fromNamespaceAndPath("rift", "cape/" + id + "/" + (System.nanoTime() & 0xffffff));
                DynamicTexture tex = newDynamic(img);
                mc.getTextureManager().register(rl, tex);
                CAPES.put(id, rl);
            } catch (Throwable ignored) {}
        });
    }

    private static void registerFrames(String id, List<byte[]> pngs) {
        Minecraft mc = Minecraft.getInstance();
        mc.execute(() -> {
            try {
                Identifier[] arr = new Identifier[pngs.size()]; int salt = (int) (System.nanoTime() & 0xffffff);
                for (int i = 0; i < arr.length; i++) {
                    NativeImage img = NativeImage.read(new java.io.ByteArrayInputStream(pngs.get(i)));
                    arr[i] = Identifier.fromNamespaceAndPath("rift", "capeanim/" + id + "/" + salt + "/" + i);
                    mc.getTextureManager().register(arr[i], newDynamic(img));
                }
                FRAMES.put(id, arr);
            } catch (Throwable ignored) {}
        });
    }

    /** DynamicTexture-Konstruktor unterscheidet sich je nach Version - passenden suchen. */
    private static DynamicTexture newDynamic(NativeImage img) throws Exception {
        for (Constructor<?> c : DynamicTexture.class.getConstructors()) {
            Class<?>[] p = c.getParameterTypes();
            if (p.length == 1 && p[0] == NativeImage.class) return (DynamicTexture) c.newInstance(img);
            if (p.length == 2 && p[0] == Supplier.class && p[1] == NativeImage.class) return (DynamicTexture) c.newInstance((Supplier<String>) () -> "rift_cape", img);
        }
        throw new IllegalStateException("DynamicTexture");
    }

    /* ---------- Cape ---------- */
    public static PlayerSkin withCape(UUID uuid, PlayerSkin skin) {
        if (uuid == null || skin == null) return null;
        Identifier rl = CAPES.get(hex(uuid)); Identifier[] fr = FRAMES.get(hex(uuid));
        if (fr != null && fr.length > 1) rl = fr[(int) ((System.currentTimeMillis() / 200) % fr.length)];
        if (rl == null) return null;
        try {
            return new PlayerSkin(skin.body(), new ClientAsset.ResourceTexture(rl, rl), skin.elytra(), skin.model(), skin.secure());
        } catch (Throwable t) { return null; }
    }
    public static UUID uuidOf(com.mojang.authlib.GameProfile profile) {
        try { return profile.id(); } catch (Throwable t) { return null; }
    }

    /* ---------- Nametag ---------- */
    public static Component nameFor(UUID uuid, Component base) {
        Data d = DATA.get(hex(uuid)); if (d == null) return null;
        MutableComponent out = Component.literal("\u2726").withStyle(Style.EMPTY.withColor(TextColor.fromRgb(0x7DD3FC)));
        if (d.plus()) out.append(Component.literal("+").withStyle(Style.EMPTY.withColor(TextColor.fromRgb(d.plusColor())).withBold(true)));
        out.append(Component.literal(" "));
        if (d.kind().equals("none") || d.colors().length == 0 && !d.kind().equals("rainbow")) return out.append(base);
        String s = base.getString(); int n = Math.max(1, s.length());
        for (int i = 0; i < s.length(); i++) {
            float k = n == 1 ? 0 : (float) i / (n - 1);
            int col = d.kind().equals("rainbow") ? java.awt.Color.HSBtoRGB(k, 0.65f, 1f) & 0xFFFFFF : lerp(d.colors(), d.kind().equals("solid") || d.kind().equals("glow") ? 0 : k);
            out.append(Component.literal(String.valueOf(s.charAt(i))).withStyle(Style.EMPTY.withColor(TextColor.fromRgb(col))));
        }
        return out;
    }

    /* ---------- Aura ---------- */
    public static void tick(Minecraft mc) {
        RiftEmotes.tick(mc);
        if (mc.level == null || DATA.isEmpty() || (++tick & 3) != 0) return;
        for (AbstractClientPlayer p : mc.level.players()) {
            Data d = DATA.get(hex(p.getUUID())); if (d == null || d.aura() == null) continue;
            ParticleOptions po = particle(d.aura()); if (po == null) continue;
            mc.level.addParticle(po, p.getX() + (RND.nextDouble() - .5) * .8, p.getY() + RND.nextDouble() * 1.9, p.getZ() + (RND.nextDouble() - .5) * .8, 0, 0.02, 0);
        }
    }
    private static ParticleOptions particle(String a) {
        return switch (a) {
            case "sparks", "stars" -> ParticleTypes.END_ROD;
            case "hearts" -> ParticleTypes.HEART;
            case "snow" -> ParticleTypes.SNOWFLAKE;
            case "embers" -> ParticleTypes.SMALL_FLAME;
            case "void" -> ParticleTypes.PORTAL;
            case "bats" -> ParticleTypes.ASH;
            default -> null;
        };
    }

    /* ---------- Helfer ---------- */
    private static String hex(UUID u) { return u.toString().replace("-", "").toLowerCase(); }
    private static int rgb(String h) { try { return Integer.parseInt(h.replace("#", ""), 16) & 0xFFFFFF; } catch (Exception e) { return 0xFFFFFF; } }
    private static int lerp(int[] c, float k) {
        if (c.length == 1) return c[0];
        float x = Math.max(0, Math.min(1, k)) * (c.length - 1); int i = Math.min(c.length - 2, (int) x); float f = x - i;
        int a = c[i], b = c[i + 1];
        return (((int) (((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * f)) << 16) | (((int) (((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * f)) << 8) | (int) ((a & 255) + ((b & 255) - (a & 255)) * f);
    }
}
