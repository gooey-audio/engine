# Multi-stage build for Rust WASM + Next.js app

# Stage 1: Build Rust WASM library
FROM rust:1.87 AS wasm-builder

# Install wasm-pack
RUN cargo install wasm-pack

# Install wasm32 target
RUN rustup target add wasm32-unknown-unknown

# Set working directory
WORKDIR /app

# Copy Rust project files
COPY lib/Cargo.toml ./
COPY lib/Cargo.lock* ./
COPY lib/src ./src
COPY lib/examples ./examples

# Build WASM library
RUN wasm-pack build --target web --out-dir /wasm-output -- --features web

# Stage 2: Build libgooey-react module
FROM node:20-alpine AS react-module-builder

WORKDIR /app

# Copy libgooey-react files
COPY libgooey-react/package*.json ./
COPY libgooey-react/tsconfig.json ./
COPY libgooey-react/src ./src

# Install dependencies and build
RUN npm install
RUN npm run build

# Stage 3: Build Next.js app
FROM node:20-alpine AS next-builder

WORKDIR /app

# Copy package files
COPY debug-ui/package*.json debug-ui/pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY debug-ui/ ./

# Copy built libgooey-react module
COPY --from=react-module-builder /app/dist ./node_modules/libgooey-react/dist
COPY --from=react-module-builder /app/package.json ./node_modules/libgooey-react/package.json

# Copy WASM output
COPY --from=wasm-builder /wasm-output ./public/wasm

# Build Next.js app
RUN pnpm run build

# Stage 4: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built app
COPY --from=next-builder /app/.next ./.next
COPY --from=next-builder /app/public ./public
COPY --from=next-builder /app/package.json ./package.json
COPY --from=next-builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Copy the built libgooey-react module
COPY --from=react-module-builder /app/dist ./node_modules/libgooey-react/dist
COPY --from=react-module-builder /app/package.json ./node_modules/libgooey-react/package.json

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Expose port
EXPOSE 3000

# Start the app
CMD ["pnpm", "start"]