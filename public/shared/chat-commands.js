export const CHAT_COMMANDS=Object.freeze([
 {id:'bid',label:'Bidding',usage:'!bid 25.00'},
 {id:'vote',label:'Chat voting',usage:'!vote 1'},
 {id:'enter',label:'Giveaway entry',usage:'!enter'},
 {id:'register',label:'Registration link',usage:'!register'},
 {id:'lot',label:'Current lot',usage:'!lot'},
]);
export const commandEnabled=(settings,id)=>settings?.[id]!==false;
export function validateCommands(input){
 const result={};for(const {id} of CHAT_COMMANDS){if(typeof input[id]!=='boolean')throw Error('Choose which chat commands are enabled.');result[id]=input[id];}return result;
}
