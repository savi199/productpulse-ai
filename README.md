# ProductPulse Studio

ProductPulse Studio is a hackathon prototype for managing product information in a commerce catalog. It provides a dashboard for reviewing product data quality, editing product details, and reviewing rule-based recommendations through an approval workflow.

> **Prototype status:** Product data is stored in local JSON files by the Express backend. The live Grok API is currently unavailable because of an API credit/spending limit, so recommendation behavior in the current demo is rule-based. WooCommerce credentials have not been configured, and live WooCommerce synchronization is not active.

## Features

- Product catalog dashboard with product cards and catalog metrics.
- Search and category filtering.
- Create and edit products, including SKU, category, description, price, stock, image, color, material, and size.
- Product data quality checks for missing or invalid fields.
- Recommendation review workflow with approve/reject/manual-review decisions.
- Activity feedback for catalog actions.
- WooCommerce connection status page that describes the intended integration.

## Technology stack

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express
- **Demo persistence:** Local JSON files (`server/products.json` and a recommendation decisions JSON file)
- **AI integration attempt:** xAI/Grok API configuration through environment variables

## Project structure

The project is organized approximately as follows:

```text
productpulse-ai/
├── src/
│   ├── App.jsx
│   ├── App.css
│   └── ...
├── server/
│   ├── server.js
│   ├── products.json
│   └── ...
├── .env                 # local secrets; do not commit
├── package.json         # frontend scripts/dependencies
└── README.md
```

Your exact files may differ slightly depending on your local setup.

## Requirements

- Node.js and npm
- A terminal such as PowerShell on Windows
- The project dependencies installed with npm

## Run locally

Open two terminal windows in VS Code.

### 1. Start the backend

```powershell
cd server
npm install
npm start
```

The backend is expected to listen on port `4000`.

Health check:

```text
http://localhost:4000/api/health
```

Products endpoint:

```text
http://localhost:4000/api/products
```

### 2. Start the frontend

In a second terminal, from the project root:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, normally:

```text
http://localhost:5173
```

If your local `package.json` uses different scripts, use the scripts shown in that file.

## API overview

The following endpoints are present in the current backend implementation:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check whether the backend is running |
| `GET` | `/api/products` | Retrieve the product catalog |
| `POST` | `/api/products` | Create a product |
| `PUT` | `/api/products/:id` | Update an existing product |

The backend also exposes agent/recommendation routes used by the interface. Refer to `server/server.js` for the current exact route names and request/response formats.

### Product validation

Product creation and updates require a non-empty product name and SKU. The backend rejects duplicate SKUs. The quality audit checks for fields such as SKU, description, color, material, and a valid positive price.

## Configuration and secrets

The project may use these environment variables for the optional xAI/Grok integration:

```env
XAI_API_KEY=your_key_here
XAI_MODEL=grok-4.7
```

- Keep the real API key in your local `.env` file.
- Never paste API keys into public repositories, screenshots, documentation, or a video.
- Do not commit `.env`. Add it to `.gitignore`.
- A configured key does not guarantee requests will succeed; account credits and spending limits must allow API use.

## AI behavior and limitations

At the time of writing, live Grok API requests are blocked by the account's credit/spending limit. The app therefore uses rule-based demo recommendations rather than claiming that live model-generated recommendations are running.

The recommendation approval workflow records decisions in local backend storage. This is a prototype workflow and is not a live WooCommerce update.

## WooCommerce status

WooCommerce synchronization is **not connected**. No store credentials have been configured and no product data has been sent to WooCommerce. To implement and verify live synchronization, configure a test WooCommerce store and its REST API credentials, implement the integration securely on the backend, and test reads/writes before presenting it as operational.

## Demo checklist

1. Start the backend and frontend.
2. Open the Overview dashboard.
3. Open Products and try searching/filtering the catalog.
4. Add a product with a unique SKU.
5. Edit a product and save the changes.
6. Refresh the browser and confirm that product changes remain.
7. Open AI Assistant and demonstrate the quality audit and recommendation decision workflow.
8. Explain that recommendations are rule-based in the current demo and WooCommerce sync is not active.
9. Do not show API secrets or claim that unavailable integrations are live.

## Troubleshooting

### Frontend cannot reach the backend
- Confirm the backend is running on port `4000`.
- Open `http://localhost:4000/api/health`.
- Check the API base URL in `src/App.jsx`.

### Product changes do not appear
- Check the backend terminal for errors.
- Open `http://localhost:4000/api/products` and confirm the backend response.
- Check that `server/products.json` is writable and that the backend is running from the expected project folder.

### Grok API request fails
- Check the backend terminal for the status and message.
- Verify the key is stored only in `.env`, the model name is supported by the account, and the account has available credits/spending allowance.
- Keep demo-mode disclosures in place until live requests have been tested successfully.

## Security and data notes

- This is a local hackathon prototype, not a production deployment.
- JSON files are local storage, not a managed database.
- Do not use real customer or confidential store data in the demo.
- Before production use, add authentication, authorization, stronger input validation, logging, backups, secure secret management, and a proper database.

## Hackathon presentation

When presenting ProductPulse Studio, focus on the product data management problem, catalog quality checks, the recommendation review/approval workflow, and how a future WooCommerce integration would fit. Clearly distinguish completed prototype functionality from planned or currently unavailable integrations.
