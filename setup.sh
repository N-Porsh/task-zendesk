#!/bin/bash

set -e  # Exit on any error

# Parse command line arguments
DEPLOY_K8S=false
if [[ "$1" == "--k8s" ]] || [[ "$1" == "-k" ]]; then
    DEPLOY_K8S=true
fi

echo "🚀 Setting up ZDT project from scratch..."

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Error: Node.js 22+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Initialize database (using ts-node for dev setup, no build needed)
echo "🗄️  Initializing database..."
npx ts-node src/database/init-db.ts

echo ""
echo "✅ Setup complete!"
echo ""

# Kubernetes deployment
if [ "$DEPLOY_K8S" = true ]; then
    echo "☸️  Deploying to Kubernetes..."
    
    # Check for kubectl
    if ! command -v kubectl &> /dev/null; then
        echo "❌ Error: kubectl is not installed. Please install kubectl to deploy to Kubernetes."
        exit 1
    fi
    echo "✅ kubectl found: $(kubectl version --client --short 2>/dev/null || echo 'installed')"
    
    # Check for Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Error: Docker is not installed. Please install Docker to build the image."
        exit 1
    fi
    echo "✅ Docker found: $(docker --version)"
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        echo "❌ Error: Docker daemon is not running. Please start Docker."
        exit 1
    fi
    echo "✅ Docker daemon is running"
    
    # Remove existing Docker image if it exists
    if docker images zdt:latest --format "{{.Repository}}:{{.Tag}}" | grep -q "zdt:latest"; then
        echo "🗑️  Removing existing zdt:latest image..."
        docker rmi zdt:latest || true
    fi
    
    # Build Docker image
    echo "🐳 Building Docker image..."
    docker build -t zdt:latest .
    echo "✅ Docker image built successfully"
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        echo "⚠️  Warning: Cannot connect to Kubernetes cluster. Make sure kubectl is configured."
        echo "   You can still build the image, but deployment will be skipped."
    else
        echo "✅ Connected to Kubernetes cluster"
        
        # Deploy PVC
        echo "📦 Creating PersistentVolumeClaim..."
        kubectl apply -f k8s/pvc.yaml
        
        # Deploy Deployment
        echo "🚀 Creating Deployment..."
        kubectl apply -f k8s/deployment.yaml
        
        echo ""
        echo "✅ Kubernetes deployment complete!"
        echo ""
        echo "To check deployment status:"
        echo "  kubectl get pods"
        echo ""
    fi
else
    echo "To run in development mode:"
    echo "  npm run dev"
    echo ""
    echo "To run in production mode:"
    echo "  npm run build"
    echo "  npm start"
    echo ""
    echo "To deploy to Kubernetes:"
    echo "  ./setup.sh --k8s"
    echo "  or"
    echo "  npm run setup:k8s"
    echo ""
fi

