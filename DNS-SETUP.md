# DNS Setup for Analytics Server

## Overview
Point `analytics.kiwichito.com` to your Raspberry Pi's IP address to make the analytics server accessible via a friendly domain name.

## Current Setup
- **Raspberry Pi IP**: `192.168.12.179` (local network)
- **Target Domain**: `analytics.kiwichito.com`
- **Server Port**: `3100`

## DNS Configuration Options

### Option 1: Cloudflare DNS (Recommended)

If `kiwichito.com` is already on Cloudflare:

1. **Login to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select `kiwichito.com` domain

2. **Add A Record**
   - Go to DNS > Records
   - Click "Add record"
   - Type: `A`
   - Name: `analytics`
   - IPv4 address: `YOUR_PUBLIC_IP` (not 192.168.12.179 - see below)
   - Proxy status: 🟠 DNS only (turn off orange cloud initially)
   - TTL: Auto
   - Click "Save"

3. **Get Your Public IP**
   ```bash
   curl ifconfig.me
   ```
   Use this IP in the A record above.

4. **Port Forwarding Required**
   Since the Pi is on local network, you need to configure your router:
   - Login to your router admin panel
   - Find Port Forwarding / Virtual Server section
   - Forward external port `3100` to `192.168.12.179:3100`
   - Protocol: TCP

### Option 2: Cloudflare Tunnel (Recommended for Security)

**Benefits**: No port forwarding, no exposing Pi to internet, built-in HTTPS

1. **Install cloudflared on Raspberry Pi**
   ```bash
   ssh kiwichito@192.168.12.179

   # Install cloudflared
   curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
   echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
   sudo apt-get update
   sudo apt-get install cloudflared
   ```

2. **Authenticate cloudflared**
   ```bash
   cloudflared tunnel login
   ```
   This opens a browser window - select `kiwichito.com`

3. **Create Tunnel**
   ```bash
   cloudflared tunnel create analytics-server

   # Note the Tunnel ID from output
   ```

4. **Configure Tunnel**
   ```bash
   sudo mkdir -p /etc/cloudflared
   sudo nano /etc/cloudflared/config.yml
   ```

   Add this configuration:
   ```yaml
   tunnel: <TUNNEL_ID_FROM_STEP_3>
   credentials-file: /home/kiwichito/.cloudflared/<TUNNEL_ID>.json

   ingress:
     - hostname: analytics.kiwichito.com
       service: http://localhost:3100
     - service: http_status:404
   ```

5. **Route DNS**
   ```bash
   cloudflared tunnel route dns analytics-server analytics.kiwichito.com
   ```

6. **Install as Service**
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```

7. **Verify**
   ```bash
   sudo systemctl status cloudflared
   ```

### Option 3: Local DNS Only (Development)

If you only need access from your local network:

1. **Edit /etc/hosts on your Mac**
   ```bash
   sudo nano /etc/hosts
   ```

2. **Add this line**
   ```
   192.168.12.179  analytics.kiwichito.com
   ```

3. **Test**
   ```bash
   curl http://analytics.kiwichito.com:3100/health
   ```

## After DNS is Configured

### Test DNS Resolution
```bash
# On your Mac
nslookup analytics.kiwichito.com

# Should return your public IP or Cloudflare IP
```

### Test Server Access
```bash
# If using Cloudflare Tunnel (HTTPS automatic)
curl https://analytics.kiwichito.com/health

# If using port forwarding
curl http://analytics.kiwichito.com:3100/health
```

Expected response:
```json
{"status":"ok","uptime":123,"timestamp":"...","mongodb":"connected"}
```

## Update CORS Origins

After DNS is configured, update the server to accept requests from the new domain:

1. **SSH into Pi**
   ```bash
   ssh kiwichito@192.168.12.179
   ```

2. **Update Docker container with new environment variable**
   ```bash
   docker stop analytics-server
   docker rm analytics-server

   docker run -d \
     --name analytics-server \
     --restart unless-stopped \
     -p 3100:3100 \
     -e MONGO_URI=mongodb://localhost:27017 \
     -e MASTER_API_KEY=<YOUR_MASTER_KEY> \
     -e PORT=3100 \
     -e NODE_ENV=production \
     -e CORS_ORIGINS="https://analytics.kiwichito.com,https://frutasdelcampo.com,https://littleanimeshop.com,https://frutalesdelcarmelo.com" \
     ghcr.io/pablohu/analytics-server:latest
   ```

## Next Steps

After DNS is working:
- ✅ Phase 5.1: DNS configured
- ⏭️ Phase 5.2: Setup SSL with Caddy (if not using Cloudflare Tunnel)
- ⏭️ Phase 6: Create frontend tracking script

---

## Troubleshooting

### DNS not resolving
```bash
# Clear DNS cache on Mac
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Check propagation
dig analytics.kiwichito.com
```

### Can't connect after DNS works
- Check firewall on Pi: `sudo ufw status`
- Check router port forwarding
- Verify Docker container is running: `docker ps | grep analytics`
- Check Docker logs: `docker logs analytics-server`

### 403 Forbidden / CORS error
- Update CORS_ORIGINS in Docker container (see above)
- Restart container: `docker restart analytics-server`
