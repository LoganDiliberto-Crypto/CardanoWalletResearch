import { submitTx } from "../utils.js";
import signed_tx from "../wallet-database/signedtx.json" assert {type: "json"};

console.log(
      "\nView in Cardanoscan: https://testnet.cardanoscan.io/transaction/" +
        (await submitTx(signed_tx.tx))
    );