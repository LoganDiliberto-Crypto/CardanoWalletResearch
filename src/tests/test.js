import { Config } from "cardano-wallet-js";
import bip39 from "bip39";
import { adaToLovelace, lovelaceToAda } from "../utils.js";

import blockfrost from '@blockfrost/blockfrost-js';


const blockfrost_api_key = "testnetBQXjqOI1c5DLckWEPsKddc062taGEjD2";

const blockfrost_api = new blockfrost.BlockFrostAPI({
  projectId: blockfrost_api_key
})

const address = await blockfrost_api.addressesUtxos(
    'addr_test1qq4ylxdrk6c0yullh2gmdl0udnrv5t5v8n6g3l2eqhhegqlm3wc0mdm3epq0uq53ul8yt4p737kglcyv84pk83tjdjfsd0qkmc',
  );

console.log(lovelaceToAda(address[0].amount[0].quantity));