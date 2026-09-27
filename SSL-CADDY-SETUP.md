# SSL Setup with Caddy (Optional)

## Overview
Set up automatic HTTPS for `analytics.kiwichito.com` using Caddy reverse proxy with Let's Encrypt SSL certificates.

**Note**: If you use Cloudflare Tunnel (see DNS-SETUP.md Option 2), SSL is automatic and you **don't need Caddy**.

## Prerequisites
- DNS already configured (analytics.kiwichito.com points to Pi)
- Port 80 and 443 open on router (forwarded to Pi)
- Analytics server running on port 3100

## Installation

### 1. Install Caddy on Raspberry Pi

SSH into your Pi:
```bash
ssh kiwichito@192.168.12.179
```

Install Caddy:
```bash
# Add Caddy repo
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Install Caddy
sudo apt update
sudo apt install caddy
```

### 2. Configure Caddy

Create Caddyfile:
```bash
sudo nano /etc/caddy/Caddyfile
```

Add this configuration:
```caddy
analytics.kiwichito.com {
    reverse_proxy localhost:3100

    # Enable compression
    encode gzip

    # Security headers
    header {
        # Enable HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        # Prevent clickjacking
        X-Frame-Options "SAMEORIGIN"
        # Prevent MIME sniffing
        X-Content-Type-Options "nosniff"
        # XSS Protection
        X-XSS-Protection "1; mode=block"
        # Referrer Policy
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logging
    log {
        output file /var/log/caddy/analytics.log
        format json
    }
}
```

### 3. Create Log Directory

```bash
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy
```

### 4. Test Configuration

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

Expected output:
```
Valid configuration
```

### 5. Restart Caddy

```bash
sudo systemctl restart caddy
sudo systemctl enable caddy
sudo systemctl status caddy
```

### 6. Verify SSL Certificate

Caddy will automatically obtain a Let's Encrypt SSL certificate. Check logs:
```bash
sudo journalctl -u caddy -f
```

You should see lines like:
```
certificate obtained successfully
```

## Testing

### Test HTTPS Access
```bash
# From your Mac
curl https://analytics.kiwichito.com/health
```

Expected response:
```json
{"status":"ok","uptime":123,"timestamp":"...","mongodb":"connected"}
```

### Test SSL Certificate
```bash
# Check certificate details
curl -vI https://analytics.kiwichito.com 2>&1 | grep -i "SSL\|TLS\|certificate"
```

### Test in Browser
Open in browser: https://analytics.kiwichito.com/health

You should see:
- 🔒 Green padlock in address bar
- Valid SSL certificate
- JSON response with server health

## Update Server CORS

Now that you have HTTPS, update the analytics server to accept HTTPS requests:

```bash
# Stop and remove old container
docker stop analytics-server
docker rm analytics-server

# Start with HTTPS origin
docker run -d \
  --name analytics-server \
  --restart unless-stopped \
  -p 3100:3100 \
  -e MONGO_URI=mongodb://localhost:27017 \
  -e MASTER_API_KEY=<YOUR_MASTER_KEY> \
  -e PORT=3100 \
  -e NODE_ENV=production \
  ghcr.io/pablohu/analytics-server:latest

# Verify container is running
docker ps | grep analytics-server
```

## Port Forwarding (Router Configuration)

Make sure your router forwards these ports to your Pi (192.168.12.179):

| External Port | Internal IP:Port | Protocol |
|---------------|------------------|----------|
| 80 | 192.168.12.179:80 | TCP |
| 443 | 192.168.12.179:443 | TCP |

## Monitoring

### View Caddy Logs
```bash
# Real-time logs
sudo journalctl -u caddy -f

# Access logs
sudo tail -f /var/log/caddy/analytics.log
```

### View Analytics Server Logs
```bash
docker logs analytics-server -f
```

### Check Certificate Expiry
```bash
echo | openssl s_client -servername analytics.kiwichito.com -connect analytics.kiwichito.com:443 2>/dev/null | openssl x509 -noout -dates
```

Caddy automatically renews certificates 30 days before expiry.

## Troubleshooting

### Certificate Not Obtained

**Check DNS propagation**:
```bash
nslookup analytics.kiwichito.com
```

**Check ports are open**:
```bash
sudo netstat -tulpn | grep -E '(:80|:443)'
```

**Check Caddy logs**:
```bash
sudo journalctl -u caddy -n 100
```

**Common issues**:
- Port 80/443 not forwarded on router
- Firewall blocking ports: `sudo ufw allow 80,443/tcp`
- DNS not propagated yet (wait 5-10 minutes)

### Connection Refused

**Check Caddy is running**:
```bash
sudo systemctl status caddy
```

**Check analytics server is running**:
```bash
docker ps | grep analytics-server
curl http://localhost:3100/health
```

**Restart both**:
```bash
docker restart analytics-server
sudo systemctl restart caddy
```

### CORS Errors

Update server.js to include HTTPS origins:
```javascript
app.use(cors({
  origin: [
    'https://analytics.kiwichito.com',
    'https://frutasdelcampo.com',
    'https://littleanimeshop.com',
    'https://frutalesdelcarmelo.com',
    'http://localhost:4200',
    'http://localhost:3000',
  ]
}));
```

Then rebuild and redeploy via GitHub Actions.

## Alternative: Skip Caddy, Use Cloudflare Tunnel

If you used Cloudflare Tunnel (DNS-SETUP.md Option 2), you already have automatic HTTPS and **don't need Caddy**.

Cloudflare Tunnel benefits:
- ✅ Automatic HTTPS
- ✅ No port forwarding needed
- ✅ DDoS protection
- ✅ Cloudflare CDN
- ✅ No public IP exposure

## Next Steps

After SSL is working:
- ✅ Phase 5.1: DNS configured
- ✅ Phase 5.2: SSL configured
- ⏭️ Phase 6: Create frontend tracking script
