HOW TO REMOVE THE "NOT SECURE" WARNING
======================================

Why it says "Not secure"
------------------------
The connection is already encrypted (https), but the browser does not
know who made the certificate, so it warns you. Nobody on the internet can
give a certificate to a private address like 192.168.x.x, so the fix is to
make your own certificate authority and tell your devices to trust it.
This takes about 5 minutes, only once, and needs internet only to download
mkcert. After that everything works offline.


PART 1 - The laptop (one time)
------------------------------
1. Double-click  setup-secure.bat  (it installs mkcert and trusts it).
   Click YES when Windows asks.
2. Close ALL terminals in VS Code, open a new one, and run:
       npm start
3. Open  https://localhost:3000  -> the padlock appears, no warning.

The server now makes the certificate by itself. If the laptop gets a new
IP address (a different Wi-Fi or hotspot), it makes a new one on start-up.
You do NOT need to do anything on the phone again for that.


PART 2 - The phone (one time per phone)
---------------------------------------
Do this while the server is running and the phone is on the same network.

1. On the phone open the "Phone, one time only" address printed in the
   terminal, it looks like  https://192.168.x.x:3000/PingPings-CA.crt
   (the first time the browser may warn - choose Advanced > Proceed).
2. Install the file you downloaded:

   ANDROID
   - Settings > Security (and privacy) > More security settings >
     Encryption & credentials > Install a certificate > CA certificate >
     Install anyway > pick PingPings-CA.crt.
   - (The exact menu names differ a little between phone brands.
     Tip: search "CA certificate" in Settings.)

   IPHONE
   - Tap Allow when Safari asks to download a profile.
   - Settings > "Profile Downloaded" > Install.
   - Settings > General > About > Certificate Trust Settings >
     switch ON "mkcert ...".

3. Close the browser completely, then open  https://192.168.x.x:3000
   The warning is gone.


If winget does not work
-----------------------
1. Go to https://github.com/FiloSottile/mkcert/releases and download the
   file ending in  windows-amd64.exe
2. Rename it to  mkcert.exe  and put it in this folder (next to server.js).
3. Open a terminal in this folder and run:   .\mkcert.exe -install
4. Run  npm start  again.


Good to know
------------
- PingPings-CA.crt is only the PUBLIC certificate. It is safe to share.
  Never share the "rootCA-key.pem" file that mkcert keeps on the laptop.
- Only install the certificate on your own devices.
- If you skip all of this, the website still works. The warning is just a
  warning (click Advanced > Proceed).
