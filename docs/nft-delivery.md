# NFT delivery and agent-wallet tools

For an **NFT-type order**, Autoloot's fulfillment ends when the exact advertised NFT transfer to the buyer-confirmed destination is independently verified at the configured chain's finalized state. Physical redemption, fees and shipping are handled by the NFT provider separately. A provider name is seller-supplied metadata, not proof of custody, authenticity or redemption eligibility.

## Implemented

Inventory can describe an NFT's chain, source wallet, provider label and exact mint or contract/token ID. NFT inventory is single-unit and unique per chain/asset. The immutable order snapshot includes that entitlement. NFT orders charge no physical shipping and Stripe checkout does not request a physical address for them. The authenticated buyer explicitly enters/repeats/confirms a compatible destination wallet. This is destination authorization, not proof of wallet ownership. Once delivery is authorized, it cannot silently change.

Supported built-in verification paths:

- ERC-721 on configured EVM chain IDs, including Base (`eip155:8453`) and Base Sepolia (`eip155:84532`). Check chain ID, successful receipt, exact source/recipient/contract/token log, canonical finalized block, authorization/payment time, recipient ownership and observed gas fee. Base receipts must include the L1 fee, which is added to the execution fee before checking the cap ([Base fee model](https://docs.base.org/specifications/transactions/network-fees)). Other EVM deployments need review of any chain-specific fee extensions before live use.
- Standard SPL Token-program, supply-one, zero-decimal NFTs on Solana mainnet (`solana:mainnet`) or devnet (`solana:devnet`). Check genesis network, finalized successful transaction, exact source/recipient mint balance changes, mint supply/decimals, current finalized recipient holdings and observed network fee.

Compressed NFTs, Token-2022 and ERC-1155 assets are not supported by these verifiers. Do not label all Beezie/Phygitals inventory compatible without checking its actual token standard, chain, source custody and transfer restrictions. Verification trusts the operator-configured RPC's view of finality; this is independent of wallet-agent claims, not a local full-node/light-client proof.

`delivered` is terminal fulfillment for a verified live NFT order; it needs no shipping/tracking record. `test-delivered` is a separately labeled simulation. A late payment webhook cannot downgrade a delivered order. Automatic refunds and stock release are blocked after NFT delivery authorization pending transfer reconciliation. Live NFT authorization and queued dispatch reject Stripe test payments. A requested or uncertain refund holds fulfillment until reconciliation. Payment and delivery are separate state machines; submitting a transaction ID is not fulfillment.

## Configuration

Keep all credentials server-side. `NFT_RPC_CONFIG` is a JSON object mapping supported chain IDs to trusted HTTPS RPC URLs (loopback HTTP is allowed for local services). Example placeholder:

```text
NFT_RPC_CONFIG={"eip155:8453":"https://YOUR_BASE_RPC","solana:mainnet":"https://YOUR_SOLANA_RPC"}
NFT_WALLET_URL=https://YOUR_CONSTRAINED_WALLET_SERVICE
NFT_WALLET_TOKEN=YOUR_DEDICATED_BRIDGE_CREDENTIAL
NFT_AGENT_TOKEN=YOUR_SEPARATE_SCOPED_AGENT_CREDENTIAL
```

No third-party provider endpoint, provider key or signer is invented or supplied by this app. Without the required configuration, live automatic NFT runs are rejected. A generic agent wallet can implement the bridge or consume the scoped job API. No private key belongs in the browser.

## Autoloot wallet-bridge protocol

This is **our adapter protocol**, not an asserted Beezie/Phygitals API:

- `POST <NFT_WALLET_URL>/transfers`: receives the immutable delivery manifest and `Idempotency-Key` header; authenticated by the dedicated bearer credential. Return `{ "transactionId": "CHAIN_TRANSACTION_ID" }` after submission, or `{ "status": "pending" }` while your durable submission job is unresolved.
- `GET <NFT_WALLET_URL>/transfers/<delivery-id>`: recover the result for that same stable ID. Return its existing transaction ID or pending/failed state. This endpoint must never create a second transfer.

The manifest binds `id`, `orderId`, exact asset/source/chain, recipient, `maxFeeAtomic`, earliest authorization/payment time, authorization expiry and `canTransfer`. The bridge must durably deduplicate IDs, validate current authorization/revocation, restrict key/asset authority, enforce fees **before signing**, and refuse unrelated assets/transfers/calls. Native atomic units differ by chain (lamports, wei). Core verification checks the observed fee afterwards but cannot undo a wallet's overspend or protect an unrestricted wallet from a malicious signer. Use constrained inventories/allowlists and bounded gas funds.

An intent is persisted before contacting the bridge. A lost submission response enters reconciliation and calls lookup on restart/retry; Autoloot never blindly issues another POST for that intent. Queued run-owned jobs cannot newly submit while their run is paused, stopped or expired. Already submitted/uncertain transactions continue reconciliation because stopping a run does not undo blockchain activity. Delivery exceptions pause the run for review. A verified delivery lets autopilot proceed without waiting for provider redemption.

## Scoped agent tools

Use `X-Autoloot-Nft-Agent: <NFT_AGENT_TOKEN>`:

- `GET /api/nft/jobs`: read authorized paid NFT delivery manifests, status, transaction ID and errors. Check expiry and `canTransfer`; do not sign from an old cached manifest.
- `POST /api/nft/submit` with `{ "id": "ORDER_ID", "transactionId": "CHAIN_TRANSACTION_ID" }`: attach a real submitted transaction to its authorized intent. This does not mark delivery complete; the verifier worker checks it.

This credential cannot select/change buyer recipients, edit inventory, change prices, arm runs or confirm payment. The operator/admin or bounded run creates the authorization. Admin-only `POST /api/nft/authorize` accepts `id`, `allowTransfer` and `maxFeeAtomic`; `POST /api/nft/verify` requests a check of a recorded transaction. Buyer-owned `POST /api/viewer/wallet` confirms the destination. Demo delivery routes refuse live orders.

## What is still missing for real unattended use

Connect and audit an actual constrained signer/agent-wallet service, confirm the providers' precise asset standards/permissions and escrow/custody path, verify buyer flow on the real chain with provider-supported assets and test failures/refunds. Add monitoring, secret management and deployment controls. On-chain payment verification/Reown checkout is not implemented: existing payment paths remain Stripe or externally verified payment. Procurement/replenishment and new break-allocation formats are not implemented. Never market guaranteed profits or a trust-free physical custody process.
