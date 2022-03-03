import { Config } from "cardano-wallet-js";
import bip39 from "bip39";

console.log(Config.Testnet);

console.log(bip39.generateMnemonic(256));