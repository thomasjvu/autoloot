# Lifecycle contracts

The runtime names its asynchronous lifecycles and checks transitions before changing their state. Domain guards still validate payment evidence, operator authorization, inventory, account identity and expiry. A transition alone never authorizes a sale, refund or transfer.

`lib/commerce/lifecycles.mjs` defines server contracts. `public/shared/state-machine.js` supplies the dependency-free transition validator and browser connection graph. Invalid transitions throw before changing the state field; repeated transitions to the same known state are idempotent.

## Checkout and refunds

Payment state is derived from existing durable fields, so old saved workspaces need no migration and there is no second persisted payment status to synchronize.

| Lifecycle | States and evidence |
| --- | --- |
| Checkout | `reserved` without a provider attempt; `outcome-unknown` when `checkoutCreated` exists without a session ID; `session-known` with a Stripe session ID; `wallet-reserved` with a wallet quote. Non-pending orders use their order status, including `processing`, `paid`, `expired` and `cancelled`. |
| Refund | `idle`; `outcome-unknown` while a request hold exists without a provider ID; `provider-pending` with a held provider refund; `succeeded` after verified success; `failed`, `canceled` or `rejected` after an unsuccessful attempt releases its hold. |

`checkoutHeld` prevents reservation expiry from releasing stock during an attempted checkout or processing payment. `refundHeld` keeps recovery attached to the existing refund attempt. A zero timestamp is an existing attempt. Lost responses keep their holds and stable idempotency keys. Provider reconciliation and existing retry deadlines remain authoritative.

## Browser connection

`createLiveConnection().state` exposes `idle`, `bootstrapping`, `connected`, `interrupted`, `recovering` or `closed`. A snapshot establishes connection; an error interrupts it; credential recovery can replace the event source. Failed bootstrap records an interruption. `start()` can restart a closed controller. Generation, source identity and refresh epoch checks discard results from older subscriptions and requests.

## Codex authentication

`CodexConnection.state` returns two independent lifecycle fields. `process` is `closed`, `initializing` or `ready`. `auth` is `idle`, `starting`, `pending`, `completed` or `failed`. These describe the local login operation; `status()` reads the authoritative account connection separately, including existing ChatGPT and API key accounts. Cancellation invalidates an in-flight login start; a late result cannot restore a cancelled login and its provider login ID is cancelled when the transport remains available. Closing the transport clears authentication and rejects pending RPC requests.

## Reveal identification

Reveal snapshots expose `phase`: `idle`, `scanning`, `searching`, `candidates`, `selecting`, `selected` or `error`. Revision checks prevent stale successes and failures from replacing newer reviews. Failures on the current revision record an error phase. Confirming a selected pull returns to idle after persistence. The scan lock remains independent because a superseded vision request can still be running while a manual search is ready.

## Runs

Run status transitions are `running → paused → running`, `paused → stopped`, and `running → completed`. Phase describes progress within the active run: `ready`, `waiting-review`, `auction`, `selling`, `waiting-payment`, `waiting-fulfillment` or `waiting-nft-delivery`. Pausing retains phase. Active phases can reconcile directly to other active phases after a webhook or restart; the runner's domain checks decide which phase applies. Terminal status and phase cannot restart. Starting a new authorized run creates a new record.

## Shipping

A package starts at `package-ready`, then becomes `quoted`; a single order starts with a quote. Purchasing moves `quoted → purchasing` before the external request. Provider reconciliation produces `unknown`, `pending`, `purchased`, `failed`, `voided` or `refund-pending`. Only failed or voided attempts can obtain new quotes. An unknown purchase must reconcile the original attempt and cannot purchase another label. Provider states can change during refresh, including refund rejection. Dispatch, package membership and carrier tracking remain separate facts, with their existing evidence checks.

## NFT fulfillment

Authorization creates `queued`; sending first persists `submitting`. A transaction ID moves delivery to `submitted`; uncertain attempts move to `reconciling`. Reconciliation uses lookup rather than sending again. Verified finality moves `submitted → confirmed`. A confirmed delivery cannot send again. Demo fulfillment creates a separate terminal `simulated` record. Run authorization, refund holds, destination and fee checks still govern delivery.

## Verification

Run `npm test` for lifecycle, provider recovery, persistence, stale response and authorization coverage. Run `npm run check` for syntax, binding, import and browser boundary checks. The lifecycle tests include forbidden retry transitions, zero timestamp holds, cancelled login responses, connection restart and superseded reveal failures.
