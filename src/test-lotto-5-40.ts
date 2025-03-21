import {
  Account,
  Args,
  bytesToStr,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import 'dotenv/config';
import { buyTicket, getTicketPrice, getTickets } from '../assembly/contracts/lotto-4-50';
import { Ticket } from '../assembly/contracts/serializable/Ticket';

// Paste the address of the deployed contract here
const CONTRACT_ADDR = 'AS19rcrNwbKcwrxu86G961H6EZjdboZkpoEgV1WEsfJofDfKVNB9';

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

const sc = new SmartContract(provider, CONTRACT_ADDR);

// let args = new Args().addString('100');
//
// await sc
//   .call('updateTicketPrice', args, { fee: Mas.fromString('0.01') })
//   .then((value) => {
//     console.log(value);
//   });
const messageBin = await sc.read('getTicketPrice');

const result = bytesToStr(messageBin.value);

console.log(`Received from the sc: ${result}`);
// console.log(`Received from the sc: ${messageBin.info.error}`);
//
// const messageBin2 = await sc.read('getHistoryOfLotto');
//
// const result2 = bytesToStr(messageBin2.value);
//
// console.log(`Received from the sc: ${result2}`);
// console.log(`Received from the sc: ${messageBin2.info.error}`);
