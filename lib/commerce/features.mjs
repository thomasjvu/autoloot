export const featureFlags=(env={})=>Object.freeze({ripStudio:env.AUTOLOOT_RIP_STUDIO==='1',giveaways:env.AUTOLOOT_GIVEAWAYS==='1',nft:env.AUTOLOOT_NFT==='1'});
