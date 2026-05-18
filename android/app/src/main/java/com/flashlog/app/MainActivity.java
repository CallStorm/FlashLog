package com.flashlog.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HeaderWebSocketPlugin.class);
        registerPlugin(TargetedSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
