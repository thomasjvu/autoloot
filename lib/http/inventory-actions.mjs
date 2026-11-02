import {Hono} from 'hono';
import {actionRoutes} from './actions.mjs';
import {previewImport,applyImport} from '../commerce/csv.mjs';
export function createInventoryActions({engine,stateFor}) {
  const router=new Hono();
  const post=actionRoutes(router,stateFor);
  post("/api/import/preview",async(c,b,req)=>{
{
          const {state: discarded, ...preview} = previewImport(engine, b);
          return c.json( preview);
        }
  });
  post("/api/import/apply",async(c,b,req)=>{
applyImport(engine, b);
  });
  post("/api/products",async(c,b,req)=>{
engine.addProduct(b);
  });
  post("/api/products/edit",async(c,b,req)=>{
engine.editProduct(b.id, b);
  });
  post("/api/products/reorder",async(c,b,req)=>{
engine.reorder(b.id, b.direction);
  });
  post("/api/products/remove",async(c,b,req)=>{
engine.removeProduct(b.id);
  });
  return router;
}
