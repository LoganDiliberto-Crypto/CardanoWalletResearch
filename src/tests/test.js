import { Config } from "cardano-wallet-js";
import bip39 from "bip39";
import { adaToLovelace, lovelaceToAda, getUtxos } from "../utils.js";

import blockfrost from '@blockfrost/blockfrost-js';


const blockfrost_api_key = "testnetBQXjqOI1c5DLckWEPsKddc062taGEjD2";

const blockfrost_api = new blockfrost.BlockFrostAPI({
  projectId: blockfrost_api_key
})

const address = await blockfrost_api.txSubmit(
    '81f90cc02c4659724b4746a9daad9728a16c242c0e1023502b4fd592e56d2a117adec6b8470a7d388d55d46c1576c6048717eda40d70310219bf34ef9722960684a40081825820f0b5771c8a3f790cac6a56c9332a2966e3e3cd055829f459e15f80020eb56e57010182825839000743d16cfe3c4fcc0c11c2403bbc10dbc7ecdd4477e053481a368e7a06e2ae44dff6770dc0f4ada3cf4cf2605008e27aecdb332ad349fda71a004c4b40825839006b10fe506191eb5db20c1786cccb72d0d496114c57915480bb923cd2fb8bb0fdb771c840fe0291e7ce45d43e8fac8fe08c3d4363c5726c931a36e20093021a0002917d031a035457aaa0f5f6',
  );

console.log(address);