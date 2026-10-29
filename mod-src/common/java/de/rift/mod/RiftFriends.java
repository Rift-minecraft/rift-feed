package de.rift.mod;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.client.Minecraft;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Freundesliste aus der Rift-Cloud (hinzufuegen/entfernen im Launcher). Aktualisiert sich alle 15 s, solange der Tab offen ist. */
public final class RiftFriends {
    public record F(String uuid, String name, boolean online, String where, boolean plus) {}
    public static volatile List<F> LIST = new ArrayList<>();
    public static volatile String code = "", status = "Lade...";
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();
    private static volatile long last; private static volatile boolean busy;
    private RiftFriends() {}

    public static void refreshIfStale() {
        if (busy || System.currentTimeMillis() - last < 15000) return;
        busy = true; last = System.currentTimeMillis();
        Thread t = new Thread(() -> {
            try {
                String api = RiftCosmetics.api(); Minecraft mc = Minecraft.getInstance();
                if (api == null || api.isEmpty()) { status = "Can't reach server"; return; }
                HttpResponse<String> r = HTTP.send(HttpRequest.newBuilder(URI.create(api + "/v1/friends")).timeout(Duration.ofSeconds(8)).header("Authorization", "Bearer " + mc.getUser().getAccessToken()).GET().build(), HttpResponse.BodyHandlers.ofString());
                if (r.statusCode() != 200) { status = "Can't reach server"; RiftLog.err("Friends " + r.statusCode()); return; }
                JsonObject o = JsonParser.parseString(r.body()).getAsJsonObject(); List<F> l = new ArrayList<>();
                JsonArray a = o.getAsJsonArray("friends");
                for (JsonElement e : a) { JsonObject f = e.getAsJsonObject(); l.add(new F(f.get("uuid").getAsString(), f.get("name").getAsString(), f.get("online").getAsBoolean(), f.has("where") ? f.get("where").getAsString() : "", f.has("plus") && f.get("plus").getAsBoolean())); }
                LIST = l; code = o.has("code") ? o.get("code").getAsString() : ""; status = l.isEmpty() ? "Noch keine Freunde - im Launcher unter Freunde hinzufuegen." : "";
            } catch (Throwable t2) { status = "Can't reach server"; } finally { busy = false; }
        }, "rift-friends");
        t.setDaemon(true); t.start();
    }
}
