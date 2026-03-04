#!/bin/bash
set -e

echo "Installing API dependencies..."
cd api
npm install

echo "Building API..."
npm run build

echo "Starting API..."
npm start
