export function wireInventory({document,$,startDialog,addProduct,confirmAction,api,setFilter,setSearch,render}) {
  document
    .querySelectorAll("[data-start]")
    .forEach((el) => (el.onclick = () => startDialog(el.dataset.start)));
  document
    .querySelectorAll("[data-edit]")
    .forEach((el) => (el.onclick = () => addProduct(el.dataset.edit)));
  document
    .querySelectorAll("[data-remove]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          confirmAction(
            "Remove product?",
            "Existing orders keep their product details.",
            () => api("/api/products/remove", { id: el.dataset.remove }),
          )),
    );
  document.querySelectorAll("[data-filter]").forEach(
    (el) =>
      (el.onclick = () => {
        setFilter(el.dataset.filter);
        render();
      }),
  );
  $("#search")?.addEventListener("input", (e) => {
    setSearch(e.target.value);
    const pos = e.target.selectionStart;
    render();
    $("#search").focus();
    $("#search").setSelectionRange(pos, pos);
  });
}
export function wireOrders({document,$,modal,api,toast,confirmAction}) {
  document.querySelectorAll("[data-order]").forEach(
    (el) =>
      (el.onclick = () => {
        const id = el.dataset.order,
          ac = el.dataset.orderAction;
        if(ac.startsWith('reconcile-')){
          const field=ac==='reconcile-checkout'?'sessionId':'refundId';
          modal(`<h2>Reconcile with Stripe</h2><p>Copy the matching ${field==='sessionId'?'Checkout session':'refund'} ID from Stripe. The server verifies the order and amount before changing its status.</p><form id="reconcile-form" class="stack-form"><label>Stripe ID<input name="reference" required></label><button class="btn primary">Verify and reconcile</button></form>`);
          $('#reconcile-form').onsubmit=async event=>{event.preventDefault();try{await api('/api/payments/'+ac,{id,[field]:new FormData(event.target).get('reference')});$('#modal').close();}catch(error){toast(error.message);}};
        } else if (ac === "ship") {
          modal(
            `<h2>Mark shipped</h2><form id="tracking-form" class="stack-form"><label>Carrier and tracking reference<input name="tracking" required maxlength="150" placeholder="USPS · 9400…"></label><button class="btn primary">Mark shipped</button></form>`,
          );
          $("#tracking-form").onsubmit = async (e) => {
            e.preventDefault();
            try {
              await api("/api/order", {
                id,
                action: ac,
                tracking: new FormData(e.target).get("tracking"),
              });
              $("#modal").close();
            } catch (e) {
              toast(e.message);
            }
          };
        } else
          confirmAction(
            ac === "test-pay"
              ? "Simulate payment?"
              : ac === "refund"
                ? "Refund this order?"
                : ac === "cancel"
                  ? "Cancel this order?"
                  : "Confirm you received payment?",
            ac === "test-pay"
              ? "This updates a demo order. No money will be charged."
              : ac === "refund"
                ? "This requests a full refund. Stock is restored only after the provider confirms success. Demo refunds are simulated."
                : ac === "cancel"
                  ? "Any open checkout is expired before stock is released."
                  : "Only confirm after verifying the funds with your payment provider. Verify funds with the external payment provider.",
            () => api("/api/order", { id, action: ac }),
          );
      }),
  );}
