import bip39 from "bip39";
import blockfrost from '@blockfrost/blockfrost-js';


const blockfrost_api_key = "";

const blockfrost_api = new blockfrost.BlockFrostAPI({
  projectId: blockfrost_api_key
})

//lovelace to ada conversion
export const lovelaceToAda = (value) => {
  return value / 1_000_000;
};

//ada to lovelace conversion
export const adaToLovelace = (value) => {
  return value * 1_000_000;
}; 

//generate 24 word mnemonic (shelley)
export const genMnemonic = () => {
  let recoveryPhrase = bip39.generateMnemonic(256);
  return recoveryPhrase;
};


/////////////////////////////////////////////////////////////

//blockfrost Functions
export const checkUtxos = async(addr) =>{
  let utxos = await blockfrost_api.addressesUtxos(addr);
  return utxos;
}

export const checkTransactions = async(addr) =>{
  let utxos = await blockfrost_api.addressesUtxos(addr);
  return utxos;
}