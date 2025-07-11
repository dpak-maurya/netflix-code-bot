# 🚀 Google Cloud Deployment Guide

## **💰 Cost Analysis**

### **Cloud Run (Recommended)**
- **Free Tier**: 2M requests/month, 360K vCPU-seconds, 180K GiB-seconds
- **Your Usage**: ~3,000 requests/month
- **Estimated Cost**: $0.12/month (mostly free!)

### **Compute Engine**
- **Free Tier**: 1 f1-micro VM
- **Paid**: $6.11/month (e2-micro)
- **Best for**: Development/testing

### **Kubernetes Engine**
- **Free Tier**: 1 cluster, 3 nodes
- **Paid**: $90+/month
- **Best for**: Enterprise scaling

## **🎯 Step-by-Step Cloud Run Deployment**

### **Prerequisites**
1. **Google Cloud Account** (Free $300 credit)
2. **Google Cloud CLI** installed
3. **Docker** installed locally

### **Step 1: Setup Google Cloud Project**

```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Login to Google Cloud
gcloud auth login

# Create new project (or use existing)
gcloud projects create netflix-code-bot-$(date +%s) --name="Netflix Code Bot"

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### **Step 2: Build and Push Docker Image**

```bash
# Configure Docker for Google Container Registry
gcloud auth configure-docker

# Build the image
docker build -t gcr.io/YOUR_PROJECT_ID/netflix-code-bot .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/netflix-code-bot
```

### **Step 3: Deploy to Cloud Run**

```bash
# Deploy the service
gcloud run deploy netflix-code-bot \
  --image gcr.io/YOUR_PROJECT_ID/netflix-code-bot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 80 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars PORT=8080
```

### **Step 4: Set Environment Variables**

```bash
# Set environment variables
gcloud run services update netflix-code-bot \
  --region us-central1 \
  --set-env-vars EMAIL_HOST=imap.gmail.com \
  --set-env-vars EMAIL_PORT=993 \
  --set-env-vars EMAIL_USER=your-email@gmail.com \
  --set-env-vars EMAIL_PASSWORD=your-app-password \
  --set-env-vars EMAIL_SENDER_FILTER=netflix@netflix.com \
  --set-env-vars EMAIL_SUBJECT_FILTER=temporary access,verification \
  --set-env-vars WHATSAPP_RECIPIENT_ID=1234567890@c.us \
  --set-env-vars PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  --set-env-vars PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### **Step 5: Configure Custom Domain (Optional)**

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service netflix-code-bot \
  --domain your-domain.com \
  --region us-central1
```

## **🔧 Alternative: Compute Engine Deployment**

### **Step 1: Create VM Instance**

```bash
# Create VM with Docker
gcloud compute instances create netflix-code-bot \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --tags=http-server,https-server \
  --metadata=startup-script='#! /bin/bash
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    
    # Pull and run container
    docker pull gcr.io/YOUR_PROJECT_ID/netflix-code-bot
    docker run -d -p 80:3000 \
      -e NODE_ENV=production \
      -e EMAIL_HOST=imap.gmail.com \
      -e EMAIL_USER=your-email@gmail.com \
      -e EMAIL_PASSWORD=your-app-password \
      -e WHATSAPP_RECIPIENT_ID=1234567890@c.us \
      gcr.io/YOUR_PROJECT_ID/netflix-code-bot'
```

### **Step 2: Configure Firewall**

```bash
# Allow HTTP traffic
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --target-tags=http-server \
  --description="Allow HTTP traffic"

# Allow HTTPS traffic
gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --target-tags=https-server \
  --description="Allow HTTPS traffic"
```

## **📊 Cost Optimization Tips**

### **1. Use Cloud Run (Serverless)**
- ✅ **Pay per request** - only when used
- ✅ **Auto-scaling** - no idle costs
- ✅ **Free tier** - 2M requests/month

### **2. Optimize Container Size**
```dockerfile
# Use Alpine Linux for smaller images
FROM node:18-alpine

# Multi-stage build to reduce size
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
COPY --from=builder /app/node_modules ./node_modules
COPY . .
```

### **3. Set Resource Limits**
```bash
# Limit memory and CPU usage
gcloud run deploy netflix-code-bot \
  --memory 512Mi \
  --cpu 0.5 \
  --max-instances 5
```

### **4. Use Cloud Storage for Logs**
```bash
# Create storage bucket for logs
gsutil mb gs://netflix-code-bot-logs

# Set up log export
gcloud logging sinks create netflix-bot-logs \
  storage.googleapis.com/YOUR_PROJECT_ID/netflix-code-bot-logs \
  --log-filter="resource.type=cloud_run_revision"
```

## **🔍 Monitoring and Billing**

### **Set Up Billing Alerts**
```bash
# Create billing budget
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Netflix Bot Budget" \
  --budget-amount=5USD \
  --threshold-rule=threshold-amount=0.5USD
```

### **Monitor Usage**
```bash
# View Cloud Run metrics
gcloud run services describe netflix-code-bot \
  --region us-central1

# Check billing
gcloud billing accounts list
```

### **Cost Tracking**
```bash
# Export billing data
gcloud billing export create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --destination-uri=gs://netflix-code-bot-logs/billing-export
```

## **🎯 Estimated Monthly Costs**

### **Low Usage (100 requests/day)**
- **Cloud Run**: $0.12/month
- **Compute Engine**: $6.11/month
- **Savings**: $5.99/month (98% cheaper!)

### **Medium Usage (1,000 requests/day)**
- **Cloud Run**: $1.20/month
- **Compute Engine**: $6.11/month
- **Savings**: $4.91/month (80% cheaper!)

### **High Usage (10,000 requests/day)**
- **Cloud Run**: $12.00/month
- **Compute Engine**: $6.11/month
- **Compute Engine wins** for high usage

## **🚀 Quick Start Commands**

```bash
# Complete deployment in one script
#!/bin/bash
PROJECT_ID="netflix-code-bot-$(date +%s)"

# Create project
gcloud projects create $PROJECT_ID --name="Netflix Code Bot"
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com

# Build and deploy
docker build -t gcr.io/$PROJECT_ID/netflix-code-bot .
docker push gcr.io/$PROJECT_ID/netflix-code-bot

gcloud run deploy netflix-code-bot \
  --image gcr.io/$PROJECT_ID/netflix-code-bot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1

echo "Deployed to: https://netflix-code-bot-$(gcloud run services describe netflix-code-bot --region us-central1 --format='value(status.url)')"
```

## **💡 Cost-Saving Recommendations**

1. **Start with Cloud Run** - Best for low to medium usage
2. **Use free tier** - 2M requests/month free
3. **Set resource limits** - Prevent over-provisioning
4. **Monitor usage** - Set up billing alerts
5. **Optimize container** - Smaller images = faster cold starts
6. **Use regional deployment** - Choose closest region

---

**Total Estimated Cost: $0.12 - $1.20/month** 🎉 