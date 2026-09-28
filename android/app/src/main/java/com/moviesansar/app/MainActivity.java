package com.moviesansar.app;

import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import android.widget.FrameLayout;
import java.io.*;
import java.util.*;

/** Local assets on an HTTPS origin. No JavaScript/native bridge or external intents. */
public class MainActivity extends Activity {
 private static final String HOST = "appassets.androidplatform.net";
 private WebView web;
 private FrameLayout root;
 private View fullscreen;
 private WebChromeClient.CustomViewCallback fullscreenCallback;
 private final Set<String> blockedHosts = new HashSet<>();
 private boolean blocked(Uri uri) {
  String host=uri.getHost(); if(host==null)return false;
  host=host.toLowerCase(Locale.ROOT);
  while(true){if(blockedHosts.contains(host))return true;int dot=host.indexOf('.');if(dot<0)return false;host=host.substring(dot+1);}
 }
 private boolean local(Uri uri){return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && (uri.getPort()==-1 || uri.getPort()==443);}
 private WebResourceResponse empty(){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
 private WebResourceResponse intercept(Uri uri){
  if(blocked(uri))return empty();
  String remotePath=uri.getPath()==null?"":uri.getPath().toLowerCase(Locale.ROOT);
  if(!local(uri)&&(remotePath.matches(".*/(popunder|popads|popcash|adsterra|vast|vpaid)(\\.[a-z]+)?$")||remotePath.startsWith("/ads/")))return empty();
  if(!local(uri))return null;
  String path=uri.getPath();
  if(path==null||!path.startsWith("/assets/")||path.contains(".."))return empty();
  path=path.substring(8);
  try{
   String mime=path.endsWith(".html")?"text/html":path.endsWith(".js")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".json")?"application/json":"text/plain";
   Map<String,String> headers=new HashMap<>();headers.put("X-Content-Type-Options","nosniff");
   return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(path));
  }catch(IOException e){return empty();}
 }
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  try(BufferedReader r=new BufferedReader(new InputStreamReader(getAssets().open("ad-hosts.txt")))){
   String line;while((line=r.readLine())!=null){line=line.trim();if(!line.isEmpty()&&!line.startsWith("#"))blockedHosts.add(line.toLowerCase(Locale.ROOT));}
  }catch(IOException ignored){}
  root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(7,9,14));setContentView(root);
  root.setOnApplyWindowInsetsListener((v,insets)->{
   if(fullscreen==null)v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   else v.setPadding(0,0,0,0);
   return insets;
  });
  web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));
  web.setBackgroundColor(Color.rgb(7,9,14));
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
  s.setCacheMode(WebSettings.LOAD_DEFAULT);s.setAllowFileAccess(false);s.setAllowContentAccess(false);
  s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(true);
  s.setMediaPlaybackRequiresUserGesture(true);s.setBuiltInZoomControls(false);
  CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return intercept(r.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
    Uri u=r.getUrl();if(blocked(u))return true;
    if(r.isForMainFrame())return !local(u);
    return !("https".equals(u.getScheme())||"about".equals(u.getScheme()));
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   // Multiple windows enabled + no onCreateWindow implementation discards pop-ups.
   @Override public boolean onJsAlert(WebView v,String u,String message,JsResult result){result.cancel();return true;}
   @Override public boolean onJsConfirm(WebView v,String u,String message,JsResult result){result.cancel();return true;}
   @Override public boolean onJsPrompt(WebView v,String u,String message,String d,JsPromptResult result){result.cancel();return true;}
   @Override public void onShowCustomView(View view,CustomViewCallback callback){
    if(fullscreen!=null){callback.onCustomViewHidden();return;}
    fullscreen=view;fullscreenCallback=callback;web.setVisibility(View.GONE);root.addView(view,new FrameLayout.LayoutParams(-1,-1));
    root.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);root.requestApplyInsets();
   }
   @Override public void onHideCustomView(){exitFullscreen();}
  });
  if(WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)){
   try(InputStream input=getAssets().open("js/player-guard.js")){
    ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[4096];int n;while((n=input.read(buf))!=-1)out.write(buf,0,n);
    String script="window.__MS_TOKEN="+JSONObject.quote(UUID.randomUUID().toString())+";"+out.toString("UTF-8");
    WebViewCompat.addDocumentStartJavaScript(web,script,Collections.singleton("*"));
   }catch(IOException ignored){}
  }
  if(state==null||web.restoreState(state)==null)web.loadUrl("https://"+HOST+"/assets/movies.html");
 }
 private void exitFullscreen(){
  if(fullscreen==null)return;root.removeView(fullscreen);fullscreen=null;web.setVisibility(View.VISIBLE);root.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);root.requestApplyInsets();
  if(fullscreenCallback!=null){fullscreenCallback.onCustomViewHidden();fullscreenCallback=null;}
 }
 @Override public void onBackPressed(){if(fullscreen!=null)exitFullscreen();else if(web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onSaveInstanceState(Bundle b){web.saveState(b);super.onSaveInstanceState(b);}
 @Override protected void onPause(){web.onPause();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){exitFullscreen();root.removeView(web);web.destroy();super.onDestroy();}
}
