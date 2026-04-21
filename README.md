# TrustPay - Decentralized Escrow Payment System on Stellar

TrustPay is a production-style MVP for escrow payments on Stellar Testnet using Soroban and Freighter. Buyers lock funds in a contract, then release payment to sellers only after confirmation.

## Features
- Freighter wallet connect and transaction signing (Testnet only)
- Soroban escrow contract with secure status transitions
- Create escrow with seller address + amount
- Buyer-only release and buyer-triggered refund
- Dashboard that loads escrow records from on-chain contract state
- Real transaction feedback with hash + explorer links
- Onboarding support: copy address, Friendbot guidance, wallet install flow
- Session transaction history and loading states

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Wallet: Freighter API
- Blockchain: Stellar Soroban smart contract (Rust)
- Network: Stellar Testnet RPC + Horizon
- Frontend deployment target: Vercel

## Architecture Diagram
```mermaid
flowchart LR
  U[Buyer/Seller User] --> FE[React Frontend]
  FE --> FW[Freighter Wallet]
  FE --> RPC[Soroban RPC]
  FW --> FE
  FE -->|Signed Tx XDR| RPC
  RPC --> CHAIN[Stellar Testnet Ledger]
  CHAIN --> RPC
  RPC --> FE
```

See full architecture details in `ARCHITECTURE.md`.

## Repository Structure
- `frontend/` - Vite React app
- `contract/trustpay-escrow/` - Soroban Rust smart contract
- `ARCHITECTURE.md` - interaction and data flow documentation

## Local Setup
### 1) Prerequisites
- Node.js 20+
- Rust + Cargo
- Soroban CLI installed ([official docs](https://developers.stellar.org/docs/tools/soroban-cli))
- Freighter browser wallet

### 2) Install Frontend
```bash
cd frontend
npm install
cp .env.example .env
```

Set:
- `VITE_SOROBAN_CONTRACT_ID` = deployed escrow contract ID
- `VITE_SOROBAN_TOKEN_CONTRACT_ID` = token contract address used for escrow funds

### 3) Build Contract
```bash
cd contract/trustpay-escrow
cargo build --target wasm32-unknown-unknown --release
```

## Soroban Deployment (Testnet)
From `contract/trustpay-escrow`:

```bash
soroban config network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

soroban config identity generate buyer
soroban config identity fund buyer --network testnet

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/trustpay_escrow.wasm \
  --source buyer \
  --network testnet
```

Then initialize once from frontend (`Initialize Contract` button) or CLI:
```bash
soroban contract invoke \
  --id <ESCROW_CONTRACT_ID> \
  --source buyer \
  --network testnet \
  -- initialize \
  --token <TOKEN_CONTRACT_ID>
```

## Run Frontend
```bash
cd frontend
npm run dev
```

Or from project root:
```bash
npm install
npm run dev
```

## Freighter Usage Guide
1. Install Freighter extension.
2. Create/import account and switch to **Testnet**.
3. Fund wallet with Friendbot.
4. Open TrustPay and click **Connect Freighter**.
5. Approve contract interactions in Freighter popup for:
   - `create_escrow`
   - `release_payment`
   - `refund_payment`

## Example Test Flow (Buyer -> Seller -> Release)
1. Buyer connects wallet and verifies address shown.
2. Buyer opens `Create Escrow`, enters seller public key and amount.
3. Buyer signs `create_escrow` transaction in Freighter.
4. Dashboard refreshes and shows escrow in `Pending`.
5. After fulfillment, buyer clicks `Release Payment`.
6. Buyer signs release transaction; status updates to `Released`.
7. Open explorer link to verify final on-chain transaction.

## Error Handling Coverage
- Wallet missing: install prompt message
- Wallet access denied/rejected: surfaced as UI error
- Wrong network: asks user to switch to Testnet
- Invalid seller address: client validation before submit
- On-chain tx failure / simulation errors: surfaced in app message panel
- Insufficient balance: propagated from RPC/simulation error messages

## Deployment
### Frontend (Vercel)
1. Import repository into Vercel.
2. Set project root to `frontend`.
3. Add env vars:
   - `VITE_SOROBAN_CONTRACT_ID`
   - `VITE_SOROBAN_TOKEN_CONTRACT_ID`
4. Deploy.

### Contract
Deploy with Soroban CLI commands above on Stellar Testnet.

## Demo Artifacts
- Live Demo: `https://<your-vercel-url>`
- Demo Video: `https://<your-video-link>`

## User Validation Tracking
- Wallet Addresses (min 5):
  1. `<wallet-1>`
  2. `<wallet-2>`
  3. `<wallet-3>`
  4. `<wallet-4>`
  5. `<wallet-5>`
- Feedback Form: `https://forms.gle/<your-form-id>`
- Excel Sheet (responses): `https://docs.google.com/spreadsheets/d/<sheet-id>`

## Level 5 Checklist (Strict)
- MVP fully functional on Stellar Testnet with real wallet signatures
- Minimum 5+ real users tested and recorded
- Google Form collects: name, email, wallet address, product rating, feedback
- Form responses exported to Excel and linked in this README
- At least 1 feedback-driven iteration implemented
- Improvement section includes a **git commit link** for each completed fix

## User Onboarding Requirements
1. Create Google Form with required fields:
   - Name
   - Email
   - Wallet address
   - Product rating (1-5)
   - Open feedback
2. Share app URL + testing steps with testnet users.
3. Export responses as Excel sheet and upload to Google Sheets/Drive.
4. Paste Google Form link + Excel link in this README.
5. Record 5+ wallet addresses that actually used the app.

Use `USER_VALIDATION_TEMPLATE.md` to track user sessions and tx hashes.

## Improvement Plan (Feedback-Driven)
- Add explicit dispute arbitration role
- Add escrow expiration + auto-refund policy
- Add indexer backend for richer analytics and pagination
- Add role-based view filters for buyer/seller
- Add notifications for status transitions
- Commit links for implemented improvements:
  - `<commit-link-1>`
  - `<commit-link-2>`
