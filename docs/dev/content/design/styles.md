# Stylesheet ownership

Every app HTML page loads `/styles/app.css` once. Its imports are an ordered cascade, not interchangeable layers. Keep the order: base modules → theme modules → feature modules → current workspace/storefront/admin refinements.

- `foundation.css`: browser reset, base type and input defaults.
- `layout-base.css`: navigation, workspace layout, panels, auction/chat/activity presentation.
- `inventory-orders-base.css`, `settings-base.css`: inventory, tables and settings defaults.
- `dialogs-base.css`, `forms-base.css`: forms, drawers, previews and supporting controls.
- `overlay-base.css`, `storefront-base.css`: original surface geometry.
- `responsive-base.css`: cross-surface breakpoint and reduced-motion defaults.
- `theme.css`, `commerce-theme.css`, `dialogs-theme.css`, `overlay-theme.css`, `storefront-theme.css`, `responsive-theme.css`: shared brand/type treatments and surface refinements, in their original sequence.
- `show-widgets.css`, `catalog.css`, `interaction.css`, `identity.css`: votes/recaps/cohost, camera/catalog, interaction feedback and identity assets.
- `workspace.css`, `storefront.css`, `admin-auth.css`: current surface refinements. Scope buyer-specific changes under `.shop-body` and admin entry under `.admin-auth-page`.

The former mixed `components.css` and historical root `style.css`, `drop.css`, `street.css`, `drop-shop.css` are retired. Edit the owning declaration instead of adding a parallel stylesheet or appending an unrelated override. Some cross-layer refinements remain deliberate; do not reorder them without checking affected surfaces.

`tests/css-cascade.test.mjs` compares the flattened, ordered rule/declaration stream to the reviewed pre-refactor baseline. Only shadowed unconditional `:root` custom properties were removed; media conditions and all other declarations keep their sequence. This checks source-cascade equivalence, not browser pixels. For a future intentional design change, review the specific CSS delta and rendered surfaces before updating its baseline hash. Do not regenerate it merely to make a failing test pass.
