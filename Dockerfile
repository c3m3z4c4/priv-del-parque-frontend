# Single-stage build using node:20-alpine (avoids nginx pull issue)
FROM node:20-alpine
WORKDIR /app

# Build-time variable for backend API URL
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Install static file server
RUN npm install -g serve

EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
