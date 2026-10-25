# CSV and shipping

Inventory → **Import CSV** accepts UTF-8, comma-separated files up to 200 KB and 500 data rows. Quoted commas, quotes, multiline fields and a UTF-8 BOM are supported. Download the example in the dialog, replace its values, then upload your file.

Map columns and preview. Every row must pass validation before **Import inventory** is enabled. Nothing is saved by previewing. A change to inventory, auctions, runs or orders invalidates an old preview; preview again. Applying saves the batch in one workspace transaction.

## Inventory columns

| Field | Meaning |
| --- | --- |
| sku | Optional unique, case-sensitive reference, up to 100 characters. Required to match an existing product. |
| title | Required, up to 100 characters. |
| quantity | Required whole number of available units, up to 10,000. New products need at least one unit; updates may set zero. |
| condition | Required seller-confirmed condition, up to 40 characters. |
| price | Required opening price in decimal USD, such as `12.50`. No currency symbols or grouping separators. |
| buyNowPrice | Optional decimal USD price. Mapping an empty value clears it on update. |
| description | Optional plain text, up to 1,000 characters. HTML is not interpreted. |
| image | Optional single HTTPS image URL or an existing uploaded `/media/…` path. Images load from that host in viewers' browsers; Autoloot does not download/store the remote image. |

**Create only** rejects a SKU already in inventory. **Update matching SKUs** replaces available quantity for matched products and creates unmatched products. Blank SKUs always create products. Duplicate SKUs within a file fail validation. Unmapped optional fields are preserved on updates; mapped empty fields clear the corresponding optional value. All imported/updated products become unlisted so the operator can review before selling.

Updates preserve product IDs. Active auction and agent-run inventory retain their engine protections. Products with unresolved pending/processing orders cannot have stock replaced through CSV. NFT inventory must be managed individually.

CSV exports from stores can be mapped manually. Common headers such as `Variant SKU`, `Variant Inventory Qty`, `Variant Price`, `Name`, `Stock`, and `Regular price` are recognized. Supply your own confirmed condition and opening price; a multi-image list must be reduced to one image URL. Variant rows need their own title/SKU. This is a CSV bridge, not an authenticated Shopify/WooCommerce connection, remote order writer or continuous stock synchronization.

## Shipping queue

Orders → **Ready to ship** shows paid physical orders without a requested refund. **All paid / digital delivery** also includes NFT orders waiting for their separate delivery process. **Fulfilled** includes shipments and completed digital deliveries. Demo orders retain their demo labels.

**Export shipping CSV** downloads paid and shipped physical orders, excluding requested refunds. It includes the stable order ID, order number, SKU, one-unit item, recipient/address fields, USD amounts, mode, status and tracking. Missing addresses remain blank: obtain and verify the address before shipment. The file contains private customer details; handle it like your order records. This generic format can be mapped into a fulfillment tool; it does not assert a carrier-specific upload schema or buy labels.

**Import tracking** accepts `Order` (order number or ID), `Carrier`, and `Tracking`. Preview the rows, then confirm that the orders have actually shipped. Invalid/unpaid/refund-pending/NFT orders block the entire batch. Reimporting the exact carrier/tracking for an already shipped order is a no-op; changing a shipped order's tracking is rejected. Carrier and tracking combined must fit within 150 characters. This records shipment; it does not independently verify carrier acceptance or transit status.

The existing per-order **Ship** action remains available. Shipping charges remain the show-configured flat per-order amount. For native Shippo rates/labels and the Pirate Ship CSV preset, see [Shipping labels](shipping.md). Incoming tracking webhooks and native commerce-platform connections remain outside this release.

## Agent/API use

Creator authentication follows [SKILL.md](../SKILL.md). `POST /api/import/preview` accepts `{kind, csv, mode?, mapping?}`. Kind is `inventory` or `tracking`; inventory mode is `create` (default) or `update`. Mapping keys are the fields above, values are exact source header names; an empty value ignores a field. The response contains headers, mapping, per-row actions/errors, `valid` and a `fingerprint`.

`POST /api/import/apply` takes the same input plus that fingerprint. Resolve every error and obtain a fresh preview after changing input or workspace data. `GET /api/fulfillment.csv` requires creator access and returns private shipping data. All routes preserve the existing origin/access controls. Exported spreadsheet cells neutralize leading formula characters.
