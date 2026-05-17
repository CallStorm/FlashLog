package com.flashlog.app;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

@CapacitorPlugin(name = "HeaderWebSocket")
public class HeaderWebSocketPlugin extends Plugin {

    private final OkHttpClient client = new OkHttpClient();
    private final Map<String, WebSocket> sockets = new ConcurrentHashMap<>();

    @PluginMethod
    public void connect(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }

        JSObject headersObj = call.getObject("headers");
        final String socketId = UUID.randomUUID().toString();

        Request.Builder requestBuilder = new Request.Builder().url(url);
        if (headersObj != null) {
            Iterator<String> keys = headersObj.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                String value = headersObj.getString(key);
                if (value != null) {
                    requestBuilder.addHeader(key, value);
                }
            }
        }

        final AtomicBoolean connectSettled = new AtomicBoolean(false);

        WebSocketListener listener =
                new WebSocketListener() {
                    @Override
                    public void onOpen(WebSocket webSocket, Response response) {
                        if (!connectSettled.compareAndSet(false, true)) {
                            return;
                        }
                        JSObject ret = new JSObject();
                        ret.put("socketId", socketId);
                        call.resolve(ret);
                    }

                    @Override
                    public void onMessage(WebSocket webSocket, ByteString bytes) {
                        JSObject data = new JSObject();
                        data.put("socketId", socketId);
                        data.put(
                                "data",
                                Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP));
                        notifyListeners("message", data);
                    }

                    @Override
                    public void onClosing(WebSocket webSocket, int code, String reason) {
                        webSocket.close(code, reason);
                    }

                    @Override
                    public void onClosed(WebSocket webSocket, int code, String reason) {
                        sockets.remove(socketId);
                        JSObject data = new JSObject();
                        data.put("socketId", socketId);
                        data.put("code", code);
                        data.put("reason", reason != null ? reason : "");
                        notifyListeners("close", data);
                    }

                    @Override
                    public void onFailure(
                            WebSocket webSocket, Throwable t, Response response) {
                        sockets.remove(socketId);
                        JSObject data = new JSObject();
                        data.put("socketId", socketId);
                        data.put("message", t.getMessage() != null ? t.getMessage() : "unknown");
                        if (response != null) {
                            data.put("code", response.code());
                        }
                        notifyListeners("error", data);
                        if (connectSettled.compareAndSet(false, true)) {
                            call.reject(
                                    t.getMessage() != null
                                            ? t.getMessage()
                                            : "WebSocket connect failed");
                        }
                    }
                };

        WebSocket webSocket = client.newWebSocket(requestBuilder.build(), listener);
        sockets.put(socketId, webSocket);
    }

    @PluginMethod
    public void send(PluginCall call) {
        String socketId = call.getString("socketId");
        String dataBase64 = call.getString("data");
        if (socketId == null || dataBase64 == null) {
            call.reject("socketId and data are required");
            return;
        }

        WebSocket webSocket = sockets.get(socketId);
        if (webSocket == null) {
            call.reject("WebSocket not found: " + socketId);
            return;
        }

        try {
            byte[] bytes = Base64.decode(dataBase64, Base64.DEFAULT);
            boolean ok = webSocket.send(ByteString.of(bytes));
            if (ok) {
                call.resolve();
            } else {
                call.reject("Failed to enqueue WebSocket message");
            }
        } catch (Exception e) {
            call.reject("Invalid base64 data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void close(PluginCall call) {
        String socketId = call.getString("socketId");
        if (socketId == null) {
            call.reject("socketId is required");
            return;
        }

        WebSocket webSocket = sockets.remove(socketId);
        if (webSocket != null) {
            webSocket.close(1000, "client close");
        }
        call.resolve();
    }
}
