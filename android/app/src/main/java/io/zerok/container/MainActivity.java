package io.zerok.container;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.LinearLayout;
import android.graphics.Color;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(50, 50, 50, 50);
        layout.setBackgroundColor(Color.parseColor("#1a1a2e"));
        
        TextView title = new TextView(this);
        title.setText("Zerok Vault");
        title.setTextSize(32);
        title.setTextColor(Color.parseColor("#e94560"));
        title.setPadding(0, 0, 0, 30);
        
        TextView status = new TextView(this);
        status.setText("Zero-Knowledge Encryption\n\nYour data is encrypted before it leaves your device.");
        status.setTextSize(16);
        status.setTextColor(Color.parseColor("#ffffff"));
        
        layout.addView(title);
        layout.addView(status);
        
        setContentView(layout);
    }
}