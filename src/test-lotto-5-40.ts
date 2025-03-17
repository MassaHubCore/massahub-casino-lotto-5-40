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
const CONTRACT_ADDR = 'AS1gFfEJBX63Gp9b4W13QASiGeuK6XZae1CoR9FKBVcnMkx8yNw5';

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

const sc = new SmartContract(provider, CONTRACT_ADDR);

let sTicket =
  '{\n' + '   "address": "",\n' + '  "numbers": [1,2,3,4,5]\n' + '}';
let args = new Args().addString('1');

// await sc
//   .call('payWinners50', args, { fee: Mas.fromString('0.01') })
//   .then((value) => {
//     console.log(value);
//   });
const messageBin = await sc.read('getCurrentLotto');

const result = bytesToStr(messageBin.value);

console.log(`Received from the sc: ${result}`);
console.log(`Received from the sc: ${messageBin.info.error}`);

const messageBin2 = await sc.read('getHistoryOfLotto');

const result2 = bytesToStr(messageBin2.value);

console.log(`Received from the sc: ${result2}`);
console.log(`Received from the sc: ${messageBin2.info.error}`);
