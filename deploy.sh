#!/bin/bash
# Build and deploy Dataset Explorer
# Usage: ./deploy.sh [build|push|run]

set -e

IMAGE_NAME="dataset-explorer"
REGISTRY="ghcr.io/peter-products"

case "${1:-build}" in
  build)
    echo "Building frontend..."
    cd search-app/client && npm install && npm run build && cd ../..

    echo "Building Docker image..."
    docker build -t $IMAGE_NAME .
    echo "Image built: $IMAGE_NAME"
    echo "Run locally: docker run -p 3001:3001 $IMAGE_NAME"
    ;;

  push)
    echo "Pushing to GitHub Container Registry..."
    docker tag $IMAGE_NAME $REGISTRY/$IMAGE_NAME:latest
    docker push $REGISTRY/$IMAGE_NAME:latest
    echo "Pushed: $REGISTRY/$IMAGE_NAME:latest"
    ;;

  run)
    echo "Running locally..."
    docker run -p 3001:3001 $IMAGE_NAME
    ;;

  *)
    echo "Usage: ./deploy.sh [build|push|run]"
    ;;
esac