# Adverta Tools

Desktop application for local image utilities and metadata editing, built with `Electron + React + TypeScript`, plus a separate `Express + SQLite` backend.

## Structure

- `app` — Electron shell, preload bridge, renderer UI, local tool processing
- `server` — Express backend, auth, subscriptions, payment abstraction, SQLite persistence
- `shared` — shared TypeScript contracts and helpers

## Features

- `Image Slicer` — splits an image into equal square tiles and exports a JSON manifest
- `Metadata Editor` — batch edits file names, timestamps, MP3 ID3 tags, PDF metadata, and image EXIF where supported
- `Batch Watermarking` — applies text or PNG watermarks to multiple local images
- `Palette Grabber` — extracts dominant colors locally, copies HEX values, exports `.ase`, `.txt`, and `.csv`
- `Auth + Subscription Modes`
  - `AUTH_MODE=mock|production`
  - `SUBSCRIPTION_MODE=mock|production`
  - mock mode supports local login, local subscription state, debug state switching, and simulated payment
  - production mode uses backend `/register`, `/login`, `/logout`, `/status`, and `/create-payment`

## Setup

1. Copy `.env.example` to `.env`
2. Install dependencies:
   - `npm install`
3. Adjust mode and backend/payment values in `.env`

## Run

- Development:
  - `npm run dev`
- Production-style local start after build:
  - `npm run build`
  - `npm run start`

## Build

- Workspace build:
  - `npm run build`
- Outputs:
  - `shared/dist`
  - `server/dist`
  - `app/out`

## Tests

- Run all tests:
  - `npm run test`

## Environment

Required core values:

- `AUTH_MODE=mock|production`
- `SUBSCRIPTION_MODE=mock|production`
- `APP_API_BASE_URL=http://127.0.0.1:3010`
- `APP_CACHE_TTL_HOURS=24`
- `SERVER_PORT=3010`
- `SERVER_HOST=127.0.0.1`
- `SERVER_DB_PATH=./server/data/adverta-tools.db`

YooKassa production placeholders:

- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_RETURN_URL`
- `YOOKASSA_WEBHOOK_SECRET`
- `YOOKASSA_PAYMENT_PAGE_URL`

If `SUBSCRIPTION_MODE=production` is selected without valid YooKassa values, the backend returns a clear payment setup error instead of silently failing.

## Changelog

- Replaced the Python desktop app with a strict `app / server / shared` workspace
- Added Electron IPC bridge and React desktop UI with dark glass styling
- Implemented local image slicing, watermarking, metadata editing, and palette exporting
- Added mock and production auth/subscription provider layers
- Added Express backend with SQLite persistence and YooKassa payment abstraction
