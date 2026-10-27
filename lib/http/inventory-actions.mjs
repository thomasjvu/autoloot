import {previewImport,applyImport} from '../csv.mjs';
import {json} from './response.mjs';
export function createInventoryActions({engine}) {
 return async function action({path,b,req,res}) {
  switch(path) {
        case "/api/import/preview": {
          const {state: discarded, ...preview} = previewImport(engine, b);
          json(res, preview);return true;
        }
        case "/api/import/apply": applyImport(engine, b); break;
        case "/api/products":
          engine.addProduct(b);
          break;
        case "/api/products/edit":
          engine.editProduct(b.id, b);
          break;
        case "/api/products/reorder":
          engine.reorder(b.id, b.direction);
          break;
        case "/api/products/remove":
          engine.removeProduct(b.id);
          break;
   default:return false;
  }
  return true;
 };
}
