// Scripted replies for explicitly selected practice mode only.
import {money} from "../commerce/engine.mjs";
export function demoReply(prompt, state) {
  const p = prompt.toLowerCase(),
    a = state.auction;
  if (/draft|create.*listing|add.*product/.test(p))
    return {
      message:
        "Listing drafts require the Codex provider. Switch providers or add the product in Inventory.",
      action: "none",
      productId: null,
      draftProduct: null,
    };
  if (/start|next|kick off/.test(p)) {
    const next =
      state.products.find((p) => p.quantity > 0 && p.id !== a?.productId) ||
      state.products.find((p) => p.quantity > 0);
    return {
      message: next
        ? `Let’s bring up ${next.title}, starting at ${money(next.price)}. Ready to open bidding?`
        : "The lineup is sold out. Add a new find to keep the show going.",
      action: next ? "start-next" : "none",
      productId: next?.id || null,
    };
  }
  if (/pause/.test(p))
    return {
      message: "I can pause the clock while you catch up.",
      action: "pause",
      productId: null,
    };
  if (/resume/.test(p))
    return {
      message:
        "Ready to bring the auction back. The clock will continue from where we paused.",
      action: "resume",
      productId: null,
    };
  if (/price|worth|value/.test(p))
    return {
      message: `${a?.product.title || state.products[0]?.title || "Your item"} has a seller-set opening price of ${money(a?.product.price || state.products[0]?.price || 0)}. I don’t have verified market comparisons. Add comparable sales before treating a suggestion as market value.`,
      action: "none",
      productId: null,
    };
  if (/order|recap|summary/.test(p)) {
    const orders = state.orders.filter(
      (o) => !["cancelled", "expired", "refunded"].includes(o.status),
    );
    return {
      message: `You’ve created ${orders.length} orders totaling ${money(orders.reduce((s, o) => s + o.amount, 0))}. ${orders.filter((o) => o.status === "pending").length} await payment. ${a?.status === "live" ? `${a.bidCount} bids on the current find.` : "Ready for your next auction."}`,
      action: "none",
      productId: null,
    };
  }
  return {
    message: a
      ? `${a.product.title}: ${a.product.description} ${a.highest ? `Current leader: ${a.highest.username} at ${money(a.highest.amount)}.` : `Opening price: ${money(a.product.price)}.`}`
      : "Autoloot companion ready. Ask me to start the next auction, recap orders, or tell you about the current product. Demo replies use local rules; select Codex for AI.",
    action: "none",
    productId: null,
  };
}
