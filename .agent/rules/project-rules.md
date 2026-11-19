# Project Rules for Antigravity Agent
# PC Builder E-Commerce (NoSQL MongoDB + FastAPI + Next.js Monorepo)

## 1. Security & Environment Files Access
- The agent is explicitly granted read and write access to all local configuration and environment files:
  - `backend/.env`
  - `backend/.env.example`
  - `frontend/.env.local`
  - `frontend/.env.example`
- The agent should automatically inspect and synchronize these files when starting servers, configuring ports, running seed scripts, or debugging database connections.
- Sensitive values (secrets, real connection passwords) MUST NOT be printed to public logs or committed to Git.
- Always ensure `.gitignore` excludes real `.env` and `.env.local` files.

## 2. NoSQL Architecture Principles
- **No SQL Relational Anti-patterns:** Avoid heavy relational joins (`$lookup`) where embedding is standard.
- **Snapshot Pattern:** For `orders`, embed an `items` array preserving product data at purchase time (`product_id`, `name`, `unit_price`, `quantity`, `sku`).
- **Dynamic Specs & Wildcard Indexing:** The `specs` field in `products` is polymorphic per component type. Ensure Wildcard Index `"specs.$**"` and Text Index on `name` are created.
- **Hierarchical Document Embedding:** Administrative boundary data (`locations`) must embed Wards inside Districts inside Provinces in a single collection.
- **Aggregation Pipelines:** Use native aggregation (`$match`, `$unwind`, `$group`, `$sort`) for analytics, revenue reports, and low-stock alerts.

## 3. Tech Stack Requirements
- **Backend:** Python FastAPI, `motor` (async MongoDB driver), `pydantic`, `python-dotenv`, `uvicorn`.
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons.
- **Compatibility Engine:** PC Builder must validate CPU Socket vs Motherboard Socket, Motherboard RAM Type vs RAM modules, and System Estimated Wattage vs PSU Wattage.
