import { Config } from "cardano-wallet-js";
import bip39 from "bip39";
import { adaToLovelace, lovelaceToAda, getUtxos } from "../utils.js";

import blockfrost from '@blockfrost/blockfrost-js';


const blockfrost_api_key = "testnetBQXjqOI1c5DLckWEPsKddc062taGEjD2";

const blockfrost_api = new blockfrost.BlockFrostAPI({
  projectId: blockfrost_api_key
})

const address = await getUtxos(
    'addr_test1qqkjchzssxmgmayu6yne9xrapkwhe72fhfg48vq0tlqzl5hm3wc0mdm3epq0uq53ul8yt4p737kglcyv84pk83tjdjfsv44nsl',
  );

console.log(address);