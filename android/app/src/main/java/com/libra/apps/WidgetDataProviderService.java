package com.libra.apps;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import androidx.annotation.Nullable;

public class WidgetDataProviderService extends Service {
    private static final String TAG = "WidgetDataProviderService";

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        Log.d(TAG, "Widget data provider service bound");
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Widget data provider service started");
        return START_STICKY;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Widget data provider service created");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Widget data provider service destroyed");
    }
}