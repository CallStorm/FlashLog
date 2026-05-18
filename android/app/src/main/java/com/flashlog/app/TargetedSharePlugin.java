package com.flashlog.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "TargetedShare")
public class TargetedSharePlugin extends Plugin {

    private static String resolvePackage(String channel) {
        if (channel == null) return null;
        switch (channel) {
            case "wechat":
                return "com.tencent.mm";
            case "qq":
                return "com.tencent.mobileqq";
            case "wework":
                return "com.tencent.wework";
            default:
                return null;
        }
    }

    private static String channelLabel(String channel) {
        if (channel == null) return "应用";
        switch (channel) {
            case "wechat":
                return "微信";
            case "qq":
                return "QQ";
            case "wework":
                return "企业微信";
            default:
                return "应用";
        }
    }

    private void launchShare(Intent intent, String channel, PluginCall call) {
        String pkg = resolvePackage(channel);
        if (pkg != null) {
            intent.setPackage(pkg);
            try {
                getActivity().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException e) {
                call.reject("未安装" + channelLabel(channel));
            }
            return;
        }

        Intent chooser = Intent.createChooser(intent, call.getString("title", "分享工时"));
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(chooser);
        call.resolve();
    }

    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }

        String channel = call.getString("channel", "more");
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text);
        String title = call.getString("title");
        if (title != null && !title.isEmpty()) {
            intent.putExtra(Intent.EXTRA_SUBJECT, title);
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        launchShare(intent, "more".equals(channel) ? null : channel, call);
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        String uriStr = call.getString("uri");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (uriStr == null || uriStr.isEmpty()) {
            call.reject("uri is required");
            return;
        }

        String channel = call.getString("channel", "more");
        Uri uri = Uri.parse(uriStr);

        if ("file".equals(uri.getScheme())) {
            File file = new File(uri.getPath());
            uri =
                    FileProvider.getUriForFile(
                            getContext(),
                            getContext().getPackageName() + ".fileprovider",
                            file);
        }

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_STREAM, uri);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        String title = call.getString("title");
        if (title != null && !title.isEmpty()) {
            intent.putExtra(Intent.EXTRA_SUBJECT, title);
        }

        launchShare(intent, "more".equals(channel) ? null : channel, call);
    }
}
