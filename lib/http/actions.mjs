// Shared response contract for creator mutations. Authorization, bounded body
// parsing and audit context are established by the application middleware.
export function actionRoutes(router,stateFor){
  return (path,handler)=>router.post(path,async c=>{
    const response=await handler(c,c.get('input'),c.get('request'));
    return response || c.json({ok:true,state:stateFor('admin')});
  });
}
