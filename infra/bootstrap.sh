#!/bin/bash
# Builds the unstuck-games.com box from nothing. Amazon Linux 2023, arm64.
#
# Runs once as EC2 user data on first boot, as root, and is safe to run again by hand:
#   sudo bash /srv/unstuck/infra/bootstrap.sh
#
# It installs what the box runs, checks out this repo, puts the systemd units in place
# and starts nginx. It never holds a secret. A service whose env file is not there yet
# (elsewhere, seren) is installed but left stopped. The env files are written on the
# box by infra/unstuck-env.py from Parameter Store (/unstuck/<service>/*).
#
# nginx gets the canonical config (infra/nginx/unstuck.conf) only once a certificate
# exists. Until then it serves port 80 alone, for the Let's Encrypt challenge and the
# redirect, so certbot has something to talk to on the first move.
set -euxo pipefail
exec > >(tee -a /var/log/unstuck-bootstrap.log) 2>&1

REPO=https://github.com/netmobster/unstuck-games.git
SRV=/srv/unstuck

# ---- packages
dnf install -y nginx git python3 python3-pip openssl
pip3 install --quiet boto3

# certbot from the distro if it has it, otherwise its own venv (the EFF route on AL2023)
if ! command -v certbot >/dev/null; then
  if ! dnf install -y certbot; then
    python3 -m venv /opt/certbot
    /opt/certbot/bin/pip install --quiet --upgrade pip certbot
    ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
  fi
fi

# 1 GB of swap: two Python services and a certbot run on 2 GB of RAM is fine until it isn't
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap defaults 0 0' >> /etc/fstab
fi

# ---- the checkout
[ -d $SRV/.git ] || git clone $REPO $SRV
git config --system --add safe.directory $SRV
mkdir -p /srv/cache /srv/contact /srv/seren $SRV/.well-known/acme-challenge
chown -R ec2-user:ec2-user $SRV /srv/cache /srv/contact /srv/seren

# ---- services. elsewhere and seren start once unstuck-env.py has written their env files.
cp $SRV/infra/systemd/*.service $SRV/infra/systemd/*.timer /etc/systemd/system/
cat > /etc/systemd/system/certbot-renew-unstuck.service <<'EOF'
[Unit]
Description=Renew the Let's Encrypt certificate, then reload nginx
[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOF
cat > /etc/systemd/system/certbot-renew-unstuck.timer <<'EOF'
[Unit]
Description=Try to renew the certificate twice a day
[Timer]
OnCalendar=*-*-* 03,15:17:00
RandomizedDelaySec=1800
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now unstuck-feed.timer unstuck-contact certbot-renew-unstuck.timer
for svc in elsewhere seren; do
  if [ -f /etc/$svc.env ]; then systemctl enable --now $svc; fi
done

# ---- TLS settings the canonical config includes (certbot --webroot does not write them)
mkdir -p /etc/letsencrypt
[ -f /etc/letsencrypt/options-ssl-nginx.conf ] || cat > /etc/letsencrypt/options-ssl-nginx.conf <<'EOF'
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
EOF
[ -f /etc/letsencrypt/ssl-dhparams.pem ] || openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048

# ---- nginx
if [ -f /etc/letsencrypt/live/unstuck-games.com/fullchain.pem ]; then
  cp $SRV/infra/nginx/unstuck.conf /etc/nginx/conf.d/unstuck.conf
else
  sed -n '/plain http: renewals/,$p' $SRV/infra/nginx/unstuck.conf > /etc/nginx/conf.d/unstuck.conf
fi
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "bootstrap done $(date -u +%FT%TZ)"
