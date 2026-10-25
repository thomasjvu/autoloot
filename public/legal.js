// Operator text is data, never HTML. Policies remain readable if the API is unavailable.
const target = document.querySelector('#operator-policy');
try {
  const response = await fetch('/api/legal');
  if (!response.ok) throw Error('Operator details unavailable.');
  const {operator,configured} = await response.json();
  target.replaceChildren();
  const heading = document.createElement('h2'); heading.textContent = 'This installation’s operator'; target.append(heading);
  const entries = [['Seller / operator',operator.name],['Public support and privacy contact',operator.email],['Shipping and fulfillment policy',operator.shipping],['Returns, refunds and disputes',operator.returns],['Operator retention notice',operator.retention]];
  for (const [label,value] of entries) {
    const title = document.createElement('h3'); title.textContent = label;
    const text = document.createElement('p'); text.textContent = value || 'Not supplied by this operator.';
    target.append(title,text);
  }
  if (!configured) {
    const note = document.createElement('p'); note.className = 'legal-note';
    note.textContent = 'Operator details are incomplete. Ask the streamer for their identity, contact and transaction/privacy policies before making a real purchase. The software publisher cannot supply those details for an independent installation.';
    target.prepend(note);
  }
} catch {
  target.textContent = 'Operator details could not be loaded. Contact the streamer for their seller identity, support/privacy contact, shipping, returns and retention policies before making a real purchase.';
}
