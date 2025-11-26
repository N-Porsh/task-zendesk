# Ticket Scoring Service

A Node.js service that calculates and provides helpdesk ticket scores via gRPC API and a React-based web dashboard.

## Features

- **gRPC API** for ticket scoring
- **React Dashboard** with filtering by agent and category
- **TypeScript** throughout the stack
- **Kubernetes** ready with provided manifests

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
cd client && npm install && cd ..
```

### Running Locally

**Development mode** (with hot reload):
```bash
npm run dev
```

- gRPC server: `localhost:50051`
- Web server: `http://localhost:3000`
- Vite dev server: `http://localhost:5173`

**Production build**:
```bash
npm run build
npm start
```

## Docker

### Build Image

```bash
docker build -t zdt:latest .
```

### Run Container

```bash
docker run -p 3000:3000 -p 50051:50051 \
  -v $(pwd)/database.db:/data/database.db \
  -e DB_PATH=/data/database.db \
  zdt:latest
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster
- kubectl configured

### Deploy

```bash
# Create PersistentVolumeClaim
kubectl apply -f k8s/pvc.yaml

# Create Deployment
kubectl apply -f k8s/deployment.yaml

# Create Service
kubectl apply -f k8s/service.yaml
```

### Access

```bash
# Get service external IP
kubectl get service zdt-service

# Or use port-forward
kubectl port-forward service/zdt-service 8080:80
```

Access at `http://localhost:8080` (if using port-forward) or the external IP.

### Database Initialization

Before deploying, ensure `database.db` is available in the persistent volume. You can:

1. Copy it manually to the PV
2. Use an init container to populate it
3. Mount it from a ConfigMap (for small databases)

## Project Structure

```
.
├── src/                  # Backend TypeScript source
│   ├── db.ts            # Database layer
│   ├── scoring.ts       # Scoring logic
│   ├── service.ts       # gRPC service handlers
│   ├── server.ts        # gRPC server
│   └── web-server.ts    # Web server
├── client/              # React frontend
│   ├── src/
│   │   ├── api/         # API client
│   │   ├── components/  # React components
│   │   └── App.tsx      # Main app
│   └── dist/            # Built frontend
├── k8s/                 # Kubernetes manifests
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── scoring.proto        # gRPC service definition
├── Dockerfile
└── database.db          # SQLite database
```

## API Endpoints

### gRPC

- `GetCategoryScores(DateRangeRequest)`: Get scores by category
- `GetOverallScore(DateRangeRequest)`: Get overall score
- `GetAgents(Empty)`: List all agents
- `GetCategories(Empty)`: List all categories
- `GetAgentScores(AgentScoreRequest)`: Get scores for specific agent
- `GetCategoryDetails(CategoryDetailsRequest)`: Get agent scores in a category

### HTTP (Web Server)

- `GET /`: React dashboard
- `GET /api/agents`: List agents
- `GET /api/categories`: List categories
- `GET /api/scores`: Get overall scores
- `GET /api/scores/agent`: Get agent-specific scores
- `GET /api/scores/category`: Get category-specific scores
