import bip39 from "bip39";
import blockfrost from '@blockfrost/blockfrost-js';
import apiKey from '../extras/blockfrost_api_key.txt';

const blockfrost_api = new blockfrost.BlockFrostAPI({
  projectId: api.key
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
export const checkSpent = async(addr) =>{
  return None;
}