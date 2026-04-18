#!/bin/bash

# Initialize Let's Encrypt SSL certificates for the Docker topology.
# Run this script exactly ONCE on your GCE Virtual Machine before running docker compose up.

if ! [ -x "$(command -v docker)" ]; then
  echo 'Error: docker is not installed.' >&2
  exit 1
fi

domain="YOUR_DOMAIN.com"
email="YOUR_EMAIL@domain.com" # Required for expiry notices
rsa_key_size=4096
data_path="./certbot"

# REPLACE PLACEHOLDERS
sed -i "s/example.org/$domain/g" frontend/nginx.prod.conf
sed -i "s/www.example.org/www.$domain/g" frontend/nginx.prod.conf

if [ -d "$data_path" ]; then
  read -p "Existing data found for $domain. Continue and replace existing certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo
fi

echo "### Creating dummy certificate for $domain ..."
path="/etc/letsencrypt/live/$domain"
mkdir -p "$data_path/conf/live/$domain"
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1 \
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

echo "### Starting nginx ..."
docker compose -f docker-compose.prod.yml up --force-recreate -d frontend
echo

echo "### Deleting dummy certificate for $domain ..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domain && \
  rm -Rf /etc/letsencrypt/archive/$domain && \
  rm -Rf /etc/letsencrypt/renewal/$domain.conf" certbot
echo

echo "### Requesting Let's Encrypt certificate for $domain ..."
domain_args="-d $domain -d www.$domain"
email_arg="--email $email"

docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot
echo

echo "### Reloading nginx ..."
docker compose -f docker-compose.prod.yml exec frontend nginx -s reload

echo
echo "Bootstrap complete. You can now bring up the full production stack via:"
echo "docker compose -f docker-compose.prod.yml up -d"
