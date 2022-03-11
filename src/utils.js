import bip39 from "bip39";
import blockfrost from "@blockfrost/blockfrost-js";

const blockfrost_api_key = "testnetBQXjqOI1c5DLckWEPsKddc062taGEjD2";

const blockfrost_api = new blockfrost.BlockFrostAPI({
  projectId: blockfrost_api_key,
});

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
export const checkUtxos = async (addr) => {
  let utxos = await blockfrost_api.addressesUtxos(addr);
  return utxos;
};

export const checkTransactions = async (addr) => {
  let utxos = await blockfrost_api.addressesUtxos(addr);
  return utxos;
};

export const checkAddress = async (addr) => {
  try {
    let address = await blockfrost_api.addresses(addr);
    if (address) {
      return address.amount[0].quantity;
    } else {
      return 0;
    }
  } catch (e) {
    return 0;
  }
};

export const getUtxos = async (addr) => {
  try {
    let utxos = await blockfrost_api.addressesUtxos(addr);

    if (utxos.length > 0) {
      let all_utxos = [];

      utxos.forEach((utxo) => {
        all_utxos.push(utxo);
      });
      return all_utxos;
    } else {
      return [];
    }
  } catch (e) {
    return [];
  }
};

export const getBalance = async (utxos) => {
  let amount = 0;
  console.log("ALL", utxos);
  utxos.forEach((utxo) => {
    amount += parseInt(utxo[0].amount[0].quantity);
  });
  return amount;
};

export const getTransactions = async (address) => {
  try {
    let tx_list = await blockfrost_api.addressesTransactions(address);
    return tx_list;
  } catch (e) {
    return [];
  }
};
