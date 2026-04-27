#!/usr/bin/env bash
set -o errexit

echo ">>> Building React frontend..."
cd ../frontend
npm install
npm run build

echo ">>> Copying React build into Django staticfiles..."
mkdir -p ../backend/staticfiles
cp -r dist/* ../backend/staticfiles/

cd ../backend

echo ">>> Installing Python dependencies..."
pip install -r requirements.txt

echo ">>> Collecting static files..."
python manage.py collectstatic --no-input

echo ">>> Running migrations..."
python manage.py migrate