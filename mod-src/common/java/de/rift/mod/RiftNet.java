package de.rift.mod;

import com.google.gson.*;
import net.minecraft.client.Minecraft;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.CompletionStage;

/** Live-Verbindung zum Rift-Worker (WebSocket): Emotes und Marker mit anderen Rift-Spielern auf demselben Server. */
public final class RiftNet {
    private static volatile WebSocket ws;
    private static volatile boolean connecting;
    private static volatile String sentRoom = "\u0000";
    private static String api = "";
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private RiftNet() {}

    public static void start(String a) {
        api = a;
        Thread t = new Thread(() -> {
            while (true) { try { Thread.sleep(4000); loop(); } catch (InterruptedException e) { return; } catch (Throwable ignored) {} }
        }, "rift-live");
        t.setDaemon(true); t.start();
    }

    private static String room(Minecraft mc) {
        try { var sd = mc.getCurrentServer(); return sd == null ? "" : sd.ip.toLowerCase(); } catch (Throwable t) { return ""; }
    }

    private static void loop() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null) { WebSocket w = ws; if (w != null) { ws = null; try { w.abort(); } catch (Throwable ignored) {} } return; }
        if (ws == null && !connecting) connect(mc);
        WebSocket w = ws; String room = room(mc);
        if (w != null && !room.equals(sentRoom)) {
            sentRoom = room; JsonObject o = new JsonObject(); o.addProperty("t", "hello"); o.addProperty("room", room); o.addProperty("lab", room.isEmpty() ? "Einzelspieler" : room);
            w.sendText(o.toString(), true);
        }
    }

    private static void connect(Minecraft mc) {
        String tok; try { tok = mc.getUser().getAccessToken(); } catch (Throwable t) { return; }
        if (tok == null || tok.length() < 20) return;
        connecting = true;
        String url = api.replaceFirst("^http", "ws") + "/v1/live?token=" + URLEncoder.encode(tok, StandardCharsets.UTF_8);
        HTTP.newWebSocketBuilder().buildAsync(URI.create(url), new Listener()).whenComplete((w, e) -> { connecting = false; if (e == null) { sentRoom = "\u0000"; ws = w; } });
    }

    public static void send(JsonObject o) { WebSocket w = ws; if (w != null) try { w.sendText(o.toString(), true); } catch (Throwable ignored) {} }

    private static final class Listener implements WebSocket.Listener {
        private final StringBuilder buf = new StringBuilder();
        @Override public void onOpen(WebSocket w) { w.request(1); }
        @Override public CompletionStage<?> onText(WebSocket w, CharSequence data, boolean last) {
            buf.append(data);
            if (last) { String s = buf.toString(); buf.setLength(0); try { handle(s); } catch (Throwable ignored) {} }
            w.request(1); return null;
        }
        @Override public CompletionStage<?> onClose(WebSocket w, int code, String reason) { ws = null; return null; }
        @Override public void onError(WebSocket w, Throwable e) { ws = null; }
    }

    private static UUID unhex(String h) {
        try { return UUID.fromString(h.replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5")); } catch (Throwable t) { return null; }
    }

    private static void handle(String s) {
        JsonObject o = JsonParser.parseString(s).getAsJsonObject(); String t = o.get("t").getAsString();
        UUID u = o.has("u") ? unhex(o.get("u").getAsString()) : null; if (u == null) return;
        Minecraft mc = Minecraft.getInstance();
        switch (t) {
            case "emote" -> { String e = o.get("e").getAsString(); mc.execute(() -> RiftEmotes.play(u, e)); }
            case "marker" -> {
                String id = o.get("id").getAsString(), name = o.has("n") ? o.get("n").getAsString() : "";
                double x = o.get("x").getAsDouble(), y = o.get("y").getAsDouble(), z = o.get("z").getAsDouble(); int col = o.get("col").getAsInt();
                mc.execute(() -> de.rift.mod.ui.RiftMarkers.addRemote(u, name, id, x, y, z, col));
            }
            case "unmarker" -> { String id = o.get("id").getAsString(); mc.execute(() -> de.rift.mod.ui.RiftMarkers.removeRemote(u, id)); }
            default -> {}
        }
    }
}
