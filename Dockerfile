FROM node:20-slim

WORKDIR /app

# Install server deps
COPY search-app/server/package*.json ./search-app/server/
RUN cd search-app/server && npm install --production

# Install xenova at search-app level for embedding
COPY search-app/package*.json ./search-app/
RUN cd search-app && npm install --production

# Copy app code
COPY search-app/server/ ./search-app/server/
COPY search-app/client/dist/ ./search-app/client/dist/

# Copy data (embeddings + metadata)
COPY search-app/data/ ./search-app/data/

# Copy schema files (needed for dataset detail endpoint)
COPY schemas/final/ ./schemas/final/

EXPOSE 3001

WORKDIR /app/search-app/server
CMD ["node", "index.mjs"]