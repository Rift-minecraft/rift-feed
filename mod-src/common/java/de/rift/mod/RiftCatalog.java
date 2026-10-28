package de.rift.mod;

import com.google.gson.*;
import net.minecraft.client.Minecraft;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;

/** Cosmetics-Katalog aus dem Launcher: Auswahl im Spiel, Speichern in der Cloud. */
public final class RiftCatalog {
    public static final class Item { public String id, type, name, rarity, aura, pet, badge, capePng; public JsonObject nametag; public List<String> capeFrames = new ArrayList<>(); }
    public static final List<Item> ITEMS = new ArrayList<>();
    public static final Map<String, String> EQUIPPED = new HashMap<>();
    public static volatile boolean plus; public static volatile String plusColor;
    public static volatile String status = "";
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();
    private RiftCatalog() {}

    private static Path dir() { return Minecraft.getInstance().gameDirectory.toPath().resolve("config"); }

    public static synchronized void load() {
        try {
            Path f = dir().resolve("rift-catalog.json"); if (!Files.exists(f)) { status = "Kein Katalog - einmal ueber den Rift-Launcher starten."; return; }
            JsonObject o = JsonParser.parseString(Files.readString(f)).getAsJsonObject();
            ITEMS.clear(); EQUIPPED.clear();
            plus = o.has("plus") && o.get("plus").getAsBoolean();
            plusColor = o.has("plusColor") && !o.get("plusColor").isJsonNull() ? o.get("plusColor").getAsString() : null;
            JsonObject eq = o.getAsJsonObject("equipped");
            for (Map.Entry<String, JsonElement> e : eq.entrySet()) if (!e.getValue().isJsonNull()) EQUIPPED.put(e.getKey(), e.getValue().getAsString());
            for (JsonElement je : o.getAsJsonArray("items")) {
                JsonObject i = je.getAsJsonObject(); Item it = new Item();
                it.id = s(i, "id"); it.type = s(i, "type"); it.name = s(i, "name"); it.rarity = s(i, "rarity"); it.aura = s(i, "aura"); it.pet = s(i, "pet"); it.badge = s(i, "badge"); it.capePng = s(i, "capePng");
                if (i.has("nametag") && i.get("nametag").isJsonObject()) it.nametag = i.getAsJsonObject("nametag");
                if (i.has("capeFrames")) for (JsonElement fe : i.getAsJsonArray("capeFrames")) it.capeFrames.add(fe.getAsString());
                ITEMS.add(it);
            }
            status = "";
        } catch (Throwable t) { status = "Katalog-Fehler: " + t.getClass().getSimpleName(); RiftLog.err("Katalog: " + t); }
    }
    private static String s(JsonObject o, String k) { return o.has(k) && !o.get(k).isJsonNull() ? o.get(k).getAsString() : null; }

    public static List<Item> of(String type) { List<Item> l = new ArrayList<>(); for (Item i : ITEMS) if (type.equals(i.type)) l.add(i); return l; }
    private static Item byId(String id) { if (id == null) return null; for (Item i : ITEMS) if (id.equals(i.id)) return i; return null; }

    /** Auswahl aendern: speichert in der Cloud und merkt es fuer den Launcher. */
    public static void equip(String type, String id) {
        if (id == null) EQUIPPED.remove(type); else EQUIPPED.put(type, id);
        new Thread(() -> {
            try {
                JsonObject eqf = new JsonObject(); for (String t : new String[]{"cape", "nametag", "aura", "pet", "badge"}) eqf.add(t, EQUIPPED.containsKey(t) ? new JsonPrimitive(EQUIPPED.get(t)) : JsonNull.INSTANCE);
                Files.writeString(dir().resolve("rift-equip.json"), eqf.toString());
                publish();
            } catch (Throwable t) { status = "Speichern fehlgeschlagen: " + t.getClass().getSimpleName(); RiftLog.err("Equip: " + t); }
        }, "rift-equip").start();
    }

    private static void publish() throws Exception {
        Minecraft mc = Minecraft.getInstance(); String api = RiftCosmetics.api();
        if (api == null || api.isEmpty() || mc.player == null) { status = "Cloud nicht erreichbar."; return; }
        JsonObject b = new JsonObject(); b.addProperty("uuid", mc.player.getUUID().toString().replace("-", "").toLowerCase());
        Item nt = byId(EQUIPPED.get("nametag")), cape = byId(EQUIPPED.get("cape")), au = byId(EQUIPPED.get("aura")), pe = byId(EQUIPPED.get("pet")), bd = byId(EQUIPPED.get("badge"));
        if (nt != null && nt.nametag != null) b.add("nametag", nt.nametag);
        b.addProperty("plus", plus); if (plusColor != null) b.addProperty("plusColor", plusColor);
        if (au != null) b.addProperty("aura", au.aura); if (pe != null) b.addProperty("pet", pe.pet); if (bd != null) b.addProperty("badge", bd.badge);
        if (cape != null && cape.capePng != null) { b.addProperty("capePng", cape.capePng); if (!cape.capeFrames.isEmpty()) { JsonArray a = new JsonArray(); for (String f : cape.capeFrames) a.add(f); b.add("capeFrames", a); } }
        HttpResponse<String> r = HTTP.send(HttpRequest.newBuilder(URI.create(api + "/v1/cosmetics")).timeout(Duration.ofSeconds(10)).header("Authorization", "Bearer " + mc.getUser().getAccessToken()).header("Content-Type", "application/json").PUT(HttpRequest.BodyPublishers.ofString(b.toString())).build(), HttpResponse.BodyHandlers.ofString());
        status = r.statusCode() == 200 ? "Gespeichert ✓" : "Cloud-Fehler " + r.statusCode();
        if (r.statusCode() == 200) RiftCosmetics.refresh();
    }
}
