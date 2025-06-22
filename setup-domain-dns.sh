#!/bin/bash

# Setup DNS for DuckDNS domain to point to ALB
# This script configures the domain to point to our Application Load Balancer

echo "🌐 Setting up DNS for Alpha Pack domain..."

# Configuration
DOMAIN_NAME="alphapack.duckdns.org"
ALB_DNS_NAME="alpha-pack-alb-1477014246.us-east-1.elb.amazonaws.com"
ALB_HOSTED_ZONE_ID="Z35SXDOTRQ7X7K"

echo "📋 Configuration:"
echo "   Domain: ${DOMAIN_NAME}"
echo "   ALB DNS: ${ALB_DNS_NAME}"
echo "   ALB Zone ID: ${ALB_HOSTED_ZONE_ID}"

# Note: DuckDNS handles the DNS automatically when you update the IP
# We just need to update DuckDNS with our ALB IP address

# Get ALB IP addresses
echo "🔍 Getting ALB IP addresses..."
ALB_IPS=$(nslookup ${ALB_DNS_NAME} | grep "Address:" | grep -v "#" | awk '{print $2}')

echo "📍 ALB IP addresses:"
echo "${ALB_IPS}"

echo "✅ DNS setup information ready!"
echo ""
echo "📝 Next steps:"
echo "1. Register domain '${DOMAIN_NAME}' on DuckDNS"
echo "2. Update DuckDNS with one of the ALB IP addresses"
echo "3. Test domain resolution"
echo ""
echo "🔧 DuckDNS Update Command (use any of the IPs above):"
echo "curl 'https://www.duckdns.org/update?domains=alphapack&token=YOUR_TOKEN&ip=ALB_IP'"
