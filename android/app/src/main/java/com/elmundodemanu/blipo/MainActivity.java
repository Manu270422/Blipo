package com.elmundodemanu.blipo;

import android.os.Build;
import android.os.Bundle;
import android.view.RoundedCorner;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.annotation.RequiresApi;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams attributes = window.getAttributes();
            attributes.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(attributes);
        }

        View decor = window.getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (view, insets) -> {
            updateSafeArea(insets);
            return insets;
        });
        if (getBridge() != null) {
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageCommitVisible(WebView view, String url) {
                    WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
                    if (insets != null) updateSafeArea(insets);
                }
            });
        }
        hideSystemBars();
        ViewCompat.requestApplyInsets(decor);
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        Window window = getWindow();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    private void updateSafeArea(WindowInsetsCompat insets) {
        if (getBridge() == null) return;
        Insets cutout = insets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.displayCutout());
        int top = cutout.top;
        int right = cutout.right;
        int bottom = cutout.bottom;
        int left = cutout.left;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            WindowInsets nativeInsets = insets.toWindowInsets();
            if (nativeInsets != null) {
                int tl = cornerPadding(nativeInsets, RoundedCorner.POSITION_TOP_LEFT);
                int tr = cornerPadding(nativeInsets, RoundedCorner.POSITION_TOP_RIGHT);
                int bl = cornerPadding(nativeInsets, RoundedCorner.POSITION_BOTTOM_LEFT);
                int br = cornerPadding(nativeInsets, RoundedCorner.POSITION_BOTTOM_RIGHT);
                top = Math.max(top, Math.max(tl, tr));
                right = Math.max(right, Math.max(tr, br));
                bottom = Math.max(bottom, Math.max(bl, br));
                left = Math.max(left, Math.max(tl, bl));
            }
        }

        float density = getResources().getDisplayMetrics().density;
        String script = "if(document.documentElement){const s=document.documentElement.style;"
            + "s.setProperty('--blipo-safe-top','" + (int) Math.ceil(top / density) + "px');"
            + "s.setProperty('--blipo-safe-right','" + (int) Math.ceil(right / density) + "px');"
            + "s.setProperty('--blipo-safe-bottom','" + (int) Math.ceil(bottom / density) + "px');"
            + "s.setProperty('--blipo-safe-left','" + (int) Math.ceil(left / density) + "px');}";
        getBridge().getWebView().evaluateJavascript(script, null);
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private int cornerPadding(WindowInsets insets, int position) {
        RoundedCorner corner = insets.getRoundedCorner(position);
        return corner == null ? 0 : (int) Math.ceil(corner.getRadius() * (1 - Math.sqrt(0.5)));
    }
}
