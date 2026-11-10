package com.yaiplay.radio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Свой мост «сайт ↔ Android»: виджет, будильник, Android Auto
        registerPlugin(YAiNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
