import {
  Account, Args,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import 'dotenv/config';
import { finalizeLotto, payWinners50 } from '../assembly/contracts/lotto-4-50';

// Paste the address of the deployed contract here
const CONTRACT_ADDR = 'AS12CTwYXGML4cgx2HALxaBqivaqs4htcp6VnHZEiZDEGFHUGwMc5';

const account = await Account.fromEnv();
const provider = Web3Provider.mainnet(account);

const sc = new SmartContract(provider, CONTRACT_ADDR);
//
let args = new Args().addString('AU12UJpAUe3SafCWrZeQt2RsHYTaHXofc9JNkNTAqrEVqr5L61ToH').addString('1708');

await sc
  .call('adminPayWinner', args, { fee: Mas.fromString('0.01') })
  .then((value) => {
    console.log(value);
  });
// const messageBin = await sc.read('adminUpdateLottoDeposit');
//
// const result = bytesToStr(messageBin.value);
//
// console.log(`Received from the sc: ${result}`);
// console.log(`Received from the sc: ${messageBin.info.error}`);
//
// const messageBin2 = await sc.read('getHistoryOfLotto');
//
// const result2 = bytesToStr(messageBin2.value);
//
// console.log(`Received from the sc: ${result2}`);
// console.log(`Received from the sc: ${messageBin2.info.error}`);
