# TrustPay Architecture

## Frontend Flow
1. User connects Freighter wallet from Home page.
2. User opens `Create Escrow`, enters seller and amount, then signs `create_escrow`.
3. User opens `Dashboard` to load all escrow IDs and escrow records from Soroban RPC.
4. Buyer signs `release_payment` (or `refund_payment`) from Dashboard action buttons.

## Wallet Interaction Flow
1. App checks Freighter installation and permission.
2. App reads account address and validates Testnet network passphrase.
3. App builds Soroban transaction, simulates it with RPC, and assembles auth entries.
4. App sends transaction XDR to Freighter for signature.
5. App submits signed transaction and polls until chain confirmation.

## Smart Contract Interaction
- Contract stores `Escrow` records with status transitions:
  - `Pending` on `create_escrow`
  - `Released` on `release_payment`
  - `Refunded` on `refund_payment`
- `buyer.require_auth()` gates create/release/refund.
- Funds are moved with token contract transfers:
  - Buyer -> contract at creation
  - Contract -> seller on release
  - Contract -> buyer on refund

## Data Flow
User input -> React UI -> Freighter sign request -> Soroban RPC submission ->
Stellar Testnet ledger -> RPC read (`list_escrows`, `get_escrow`) -> Dashboard render.
