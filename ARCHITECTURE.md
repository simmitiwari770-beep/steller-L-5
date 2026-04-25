# TrustPay Architecture

## End-to-End Flow (Detailed)
1. **User (Buyer/Seller)** enters escrow details or action intent in React UI.
2. **React App** validates input (wallet connected, address format, amount > 0, buyer != seller).
3. **Freighter Integration Layer** verifies extension install + Testnet network.
4. **Soroban Client Layer** builds contract invocation transactions and simulates with Soroban RPC.
5. **Freighter Wallet** receives XDR, prompts user, and signs with user private key.
6. **Soroban RPC** submits signed transaction to Stellar Testnet.
7. **Blockchain Ledger** executes contract logic and token transfer state changes.
8. **Frontend Polling + Reads** wait for tx completion, then fetches `list_escrows` and `get_escrow`.
9. **UI Rendering Layer** refreshes cards, status badges, tx hashes, and explorer links.

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

## Contract Method Semantics
- `initialize(token: Address)`  
  Stores token contract address once and initializes escrow id counters.
- `create_escrow(buyer: Address, seller: Address, amount: i128) -> u64`  
  Validates amount and distinct buyer/seller, transfers funds into escrow contract, returns escrow id.
- `release_payment(escrow_id: u64)`  
  Buyer-auth only; requires `Pending`; transfers escrow amount from contract to seller.
- `refund_payment(escrow_id: u64)`  
  Buyer-auth only; requires `Pending`; transfers escrow amount from contract back to buyer.
- `list_escrows() -> Vec<u64>` + `get_escrow(id: u64) -> Escrow`  
  Used by dashboard to guarantee real on-chain reads (no dummy local escrow state).

## Data Flow
User input -> React UI -> Freighter sign request -> Soroban RPC submission ->
Stellar Testnet ledger -> RPC read (`list_escrows`, `get_escrow`) -> Dashboard render.
