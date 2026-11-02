# Shipping labels: Shippo and Pirate Ship

Autoloot supports native Shippo rate shopping and label purchasing, plus a Pirate Ship CSV round trip. Shopify and WooCommerce remain CSV inventory sources; this does not synchronize remote stores.

## Shippo setup

Use your own seller Shippo account and configure its carrier accounts/billing in Shippo. In **Settings → Shipping → Set up shipping**, enter a **test** API token first, a US ship-from address, and measured package presets. The suggested card/slab sizes are examples, not verified weights. Labels use a 4×6 PDF format.

The token is saved privately in `DATA_DIR/shippo.json` with mode 0600. Alternatively set `SHIPPO_API_TOKEN` in the server environment or ignored `.env`; this takes precedence and cannot be changed from the settings form. The token is never returned to the browser, buyer, public snapshot or companion. Configure from localhost. Addresses/presets persist in the existing private SQLite workspace and backups. Backups of SQLite do not include the separate token file; retain secrets separately if needed for recovery.

A `shippo_test_` token supports demo orders only. A `shippo_live_` token supports live orders only. Test labels are not valid postage and are labeled as test/practice in Autoloot. Changing tokens invalidates quotes and requires the original token configuration for reconciliation of existing attempts. Do not rotate tokens during an unresolved purchase without planning reconciliation in Shippo.

## Rate → label → dispatch

1. Open a paid physical order and choose **Create shipping label**. NFT orders use their existing digital fulfillment flow.
2. Confirm/correct the buyer's address. Autoloot's first label integration supports US-to-US addresses and USPS, UPS and FedEx rates. Confirm measurements in inches and weight in ounces. Shippo receives recipient/sender addresses and package measurements when rates are requested. Shippo validates US addresses, but the seller must still verify the recipient and any carrier notices.
3. Choose a returned USD rate. The quoted amount, carrier/service and available delivery estimate appear together. Estimates are not guarantees. Quotes expire after 15 minutes; address/account changes require new rates.
4. Approve the exact displayed postage charge and buy the label. The cost is charged to the seller's Shippo account. Autoloot persists the purchase intent before contacting Shippo. Buying a label leaves the order **paid** and does not advance a run waiting for physical fulfillment.
5. Open/print the PDF label. The label link contains private address information; do not share it publicly. Carrier status refresh retrieves the latest state on demand. It does not automatically mark an order fulfilled.
6. After handing off the package, confirm dispatch. The order becomes **shipped**, using the label's carrier and tracking. For demo orders this is explicitly a simulated dispatch.

Autoloot retains the buyer's already-agreed flat shipping charge. Postage cost is stored separately in the shipment's chosen rate. This integration does not retroactively charge the buyer a postage difference. Carrier adjustments, insurance, customs, pickups, hazardous goods declarations and live checkout rates are outside this initial flow.

## Failure/recovery

Repeated clicks cannot buy a second label for the same active intent. A network interruption, malformed response or server restart during purchase leaves the attempt unresolved. Use **Refresh label / refund status** to look up transactions by the original rate and attempt metadata. If necessary, enter the existing transaction ID from Shippo; Autoloot retrieves it and checks its metadata, rate and test/live environment. A missing result is not proof that no purchase happened and never permits a new purchase.

An uncertain/pending label blocks replacement quotes, dispatch and order refund until reconciled. A provider-confirmed error allows requesting a new quote. For unused purchased postage, request its refund/void in Shippo, then refresh in Autoloot. A pending postage refund remains blocked; a provider-confirmed refunded label allows the normal order refund path. A refund rejection restores the usable purchased label when available. Autoloot does not itself request postage refunds in this release.

Demo reset is blocked while demo label attempts need reconciliation, or while a shipping call is running. Physical order refunds also remain subject to the existing payment provider rules. A shipment's carrier status is separate from the payment and fulfillment state machines.

## Pirate Ship

Pirate Ship does not offer a public API. Use **Orders → Pirate Ship CSV** to export paid physical orders without active Shippo labels. Add missing addresses first; export fails if required address fields are missing. Orders remain unfulfilled until dispatch is recorded.

Upload the CSV in Pirate Ship and map the separate Name, Address 1/2, City, State, Zip and Country fields. Preserve **Order ID** as order/reference or passthrough data so the export can match it back to Autoloot. Add measured weights/dimensions and buy/print labels there. Demo rows are explicitly marked in the Mode column; use fictional data only for practice and do not purchase live postage for demo rows.

Export shipment history from Pirate Ship with the original Order ID, Carrier and Tracking Number. In Autoloot choose **Import tracking**; those headers are recognized automatically, with manual mapping available. Only confirm the import after actual handoff. Label creation in Pirate Ship alone is not proof of shipment. Keep ZIPs/tracking as text when using spreadsheet editors.

## API

All routes require creator access. Settings additionally requires localhost access.

- `POST /api/shipping/settings`: `{token?, from, presets}`; from uses `name,line1,line2,city,state,postal_code,country,phone,email`; presets use `name,length,width,height,weight`.
- `POST /api/shipping/address`: `{id,address,confirmed:true}` for a paid physical order before an unresolved/active label.
- `POST /api/shipping/rates`: `{id,parcel:{length,width,height,weight}}`.
- `POST /api/shipping/buy`: `{id,quoteId,rateId,amount,confirmed:true}`. Amount is the selected saved quote in integer cents.
- `POST /api/shipping/refresh`: `{id,transactionId?}`. Refresh never purchases.
- `POST /api/shipping/track`: `{id}` for on-demand carrier state.
- `POST /api/shipping/dispatch`: `{id,confirmed:true}` after handoff.
- `GET /api/pirateship.csv`: private address export.

Shipment snapshots persist with each order, including the purchase attempt, provider transaction, selected rate, label, tracking and check times. Buyer-owned responses include only shipment status, test flag, tracking number/link/status; sender addresses, label links and reconciliation details remain creator-only. There is no incoming Shippo webhook endpoint: explicit refresh works for local installations without requiring a public callback.

## Verification boundary

`tests/shipping.test.mjs` exercises the domain/provider adapter with injected responses. `tests/shipping-http.test.mjs` launches a disposable server using an explicit test-only fetch preload and checks access, setup, rates, purchase, tracking, refund guards and dispatch. The preload is never loaded by normal startup. Browser QA also uses that isolated fixture server. No real Shippo API label transaction or live postage purchase has been executed during this implementation. Configure your test token and verify real provider rates/labels before switching to live.

Official references: [Shippo label flow](https://docs.goshippo.com/guides/generate-shipping-label), [Shippo testing](https://docs.goshippo.com/guides/testing), [Pirate Ship API boundary](https://support.pirateship.com/en/articles/2309246-does-pirate-ship-have-an-api), [Pirate Ship spreadsheets](https://www.pirateship.com/integrations/spreadsheets).

## Order attention and packing

Orders → **Needs attention** collects unpaid/processing orders, incomplete recipient addresses, unverified live payments, unresolved checkout/refund/label outcomes and failed digital transfers. Follow the displayed next step and existing order controls; an uncertain provider outcome is not permission to repeat a purchase or transfer.

**Packing by buyer** groups eligible paid, unshipped physical orders by verified buyer ID, live/practice mode and matching recipient destination. Different buyers, addresses or modes stay separate. Missing identities/addresses, refund requests, unverified live payments and active labels are excluded and listed for review. The view includes item/order counts and actual totals, including separately charged shipping.

Choose **Create combined package** on a matching group, select 2–50 orders and confirm the recipient and unchanged buyer charges. The package holds those exact orders. Open Shipping from any member to measure the complete parcel, obtain rates and buy one label. After carrier handoff, **Dispatch all N orders** marks every member shipped together with the same tracking. Practice packages use simulated dispatch. Existing buyer shipping charges and totals remain unchanged; creating a package does not issue refunds or consolidate checkout.

You cannot edit member addresses, refund individual members, buy separate labels or dispatch members through manual/CSV tracking while they belong to a package. **Release package** is available before a label purchase attempt, or after Shippo confirms failure or a refunded/voided label. Release retains package and label history. Unknown, pending, purchased or refund-pending labels must be reconciled first. Refresh from any member recovers the original attempt and never purchases another label. A failure after a provider call keeps the committed purchase hold through restart.

The first member is the canonical shipment authority. Every member stores an independent snapshot with the same package ID, immutable member IDs, buyer, mode and destination. Mutations project the canonical shipment to every member in one storage commit; dispatch also changes all member statuses in that commit. This survives JSON/SQLite reloads without relying on shared object references. Buyer APIs expose only existing shipment status/tracking fields, not package membership or provider evidence.

Creator-only API additions:

- `POST /api/shipping/package`: `{orderIds:["order-id-1","order-id-2"],confirmed:true}`.
- `POST /api/shipping/package/release`: `{id:"any-member-order-id",confirmed:true}`.
- Existing rates, buy, refresh, track and dispatch routes accept any member order ID and operate on its shared package.

Domain and fixture HTTP tests cover combined purchase/dispatch, ownership and destination validation, member bypass guards, recovery after JSON reload, concurrency holds and storage failures. No live postage purchase is performed by these checks.
