import {
  Address,
  Context,
  generateEvent,
  sendMessage,
  setBytecode,
  Storage,
  transferCoins,
  transferCoinsOf,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { onlyOwner } from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import {
  ASC_FEE,
  LOTTO_,
  LOTTO_HOUR_INTERVAL,
  LOTTO_ROUND_COUNT,
  MAX_GAS_ASYNC_FT,
  OWNER,
  TICKET_,
  TICKET_COUNT,
  TICKET_PRICE,
} from './utils/tags';
import { Lotto } from './serializable/Lotto';
import { Ticket } from './serializable/Ticket';
import { OWNER_KEY } from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  Storage.set(OWNER, Context.caller().toString());
  Storage.set(LOTTO_ROUND_COUNT, '0');
  Storage.set(TICKET_COUNT, '0');
  Storage.set(TICKET_PRICE, '25');
  Storage.set(LOTTO_HOUR_INTERVAL, '24');
  const args = new Args().add('0').serialize();
  const validityStartPeriodNewRound =
    Context.currentPeriod() + 18;
  const validityEndPeriodNewRound =
    Context.currentPeriod() + 19;
  sendMessage(
    Context.callee(),
    'initLotto',
    validityStartPeriodNewRound,
    0,
    validityEndPeriodNewRound,
    31,
    MAX_GAS_ASYNC_FT,
    ASC_FEE,
    0,
    args,
  );

  generateEvent(`New round will start at ${validityStartPeriodNewRound} - ${validityEndPeriodNewRound} period`);
}

export function initLotto(binaryArgs: StaticArray<u8>): void {
  // validate owner
  const owner = Storage.get(OWNER_KEY);
  assert(
    Context.callee() === Context.caller() || Context.caller().toString() === owner,
    'The caller must be the contract itself',
  );

  const args = new Args(binaryArgs);
  const bInitialDeposit = args.nextString().unwrap();
  const initialDeposit = u64.parse(bInitialDeposit);

  // init new lotto round count
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  const newLottoCount = u64.parse(lottoRoundCount) + 1;
  Storage.set(LOTTO_ROUND_COUNT, newLottoCount.toString());

  // init new lotto
  const sHours = Storage.get(LOTTO_HOUR_INTERVAL);
  const hours = u64.parse(sHours);
  const startDate = Date.now();
  const endDate = (startDate + hours * 60 * 60 * 1000) - (16 * 1000);
  const ticketPrice = u64(Math.round(<number>initialDeposit * 0.01));
  const lotto = new Lotto(
    newLottoCount,
    startDate,
    endDate,
    ticketPrice,
    initialDeposit,
    initialDeposit,
  );
  Storage.set(
    LOTTO_.concat(newLottoCount.toString()),
    lotto.serialize(),
  );
  generateEvent(`Lottery round ${newLottoCount} begins`);

  // send event in future to finalize lotto
  const validityStartPeriod =
    Context.currentPeriod() + (hours * 60 * 60) / 16;
  const validityEndPeriod =
    validityStartPeriod + 1;
  sendMessage(
    Context.callee(),
    'finalizeLotto',
    validityStartPeriod,
    0,
    validityEndPeriod,
    31,
    MAX_GAS_ASYNC_FT,
    ASC_FEE,
    0,
    new Args().serialize(),
  );
  generateEvent(`Lottery ${newLottoCount} will be finalized in ${validityStartPeriod} - ${validityEndPeriod} period`);
}

export function adminGetTicketPrice(): StaticArray<u8> {
  onlyOwner();
  return stringToBytes(Storage.get(TICKET_PRICE));
}

export function adminUpdateTicketPrice(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const price = args.nextString()
    .expect('Missing price');
  Storage.set(TICKET_PRICE, price);
}

export function adminGetLottoHourInterval(): StaticArray<u8> {
  onlyOwner();
  return stringToBytes(Storage.get(LOTTO_HOUR_INTERVAL));
}

export function adminUpdateLottoHourInterval(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const hours = args.nextString()
    .expect('Missing hours');
  Storage.set(LOTTO_HOUR_INTERVAL, hours);
}

export function getCurrentLotto(): StaticArray<u8> {
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  const sLotto = Storage.get(LOTTO_.concat(lottoRoundCount.toString()));
  const lotto = Lotto.deserialize(sLotto);
  const dateNow = Date.now();
  assert(dateNow < lotto.endDate && lotto.isActive, `Lottery round ${lottoRoundCount} is over`);
  return stringToBytes(sLotto);
}

export function adminUpdateLottoDeposit(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const sDeposit = args.nextString()
    .expect('Missing deposit');
  const deposit = u64.parse(sDeposit);
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  const sLotto = Storage.get(LOTTO_.concat(lottoRoundCount.toString()));
  const lotto = Lotto.deserialize(sLotto);
  lotto.deposit = deposit;
  Storage.set(LOTTO_.concat(lottoRoundCount), lotto.serialize());
}

export function getHistoryOfLotto(): StaticArray<u8> {
  const historyOfLotto: Lotto[] = [];
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  let iLottoRoundCount = u64.parse(lottoRoundCount);
  let index = 1;
  while (index <= 5) {
    if (iLottoRoundCount > 0) {
      if (Storage.has(LOTTO_.concat(iLottoRoundCount.toString()))) {
        const sLotto = Storage.get(LOTTO_.concat(iLottoRoundCount.toString()));
        const lotto = Lotto.deserialize(sLotto);
        if (!lotto.isActive) {
          historyOfLotto.push(lotto);
          index = index + 1;
        }
      }
      iLottoRoundCount = iLottoRoundCount - 1;
    } else {
      index = 6;
    }
  }
  return stringToBytes(Lotto.serializeArray(historyOfLotto));
}

export function supplyDeposit(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const sDeposit = args.nextString()
    .expect('Missing supply deposit');

  const amount = u64.parse(sDeposit) * 10 ** 9;
  assert(
    Context.transferredCoins() >= amount,
    `Invalid amount in SC call ${Context.transferredCoins()}`,
  );

  transferCoins(Context.callee(), amount);

  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  const sLotto = Storage.get(LOTTO_.concat(lottoRoundCount.toString()));
  const lotto = Lotto.deserialize(sLotto);
  lotto.deposit = lotto.deposit + u64.parse(sDeposit);
  Storage.set(LOTTO_.concat(lottoRoundCount.toString()), lotto.serialize());
  generateEvent(`Supplying ${amount} MAS to lottery round ${lottoRoundCount}`);
}

export function buyTicket(binaryArgs: StaticArray<u8>): void {
  // check if lotto is active
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  const sLotto = Storage.get(LOTTO_.concat(lottoRoundCount.toString()));
  const lotto = Lotto.deserialize(sLotto);
  assert(lotto.isActive, `Lottery round ${lottoRoundCount} is over`);

  // validate args from ticket
  const args = new Args(binaryArgs);
  const sTicket = args.nextString()
    .expect('Missing ticket arguments');
  let ticket = Ticket.deserialize(sTicket);
  assert(ticket.numbers.length === 5, 'Wrong ticket format');
  const b: Set<u8> = new Set;
  for (let i = 0; i < ticket.numbers.length; i++) {
    b.add(ticket.numbers[i]);
  }
  assert(b.size == ticket.numbers.length, 'Wrong ticket format, no duplications allowed');
  for (let i: u8 = 0; i < 5; i++) {
    assert(
      ticket.numbers[i] >= 1,
      `Wrong ticket format, selected numbers can't be negative, ${ticket.serialize()}, `,
    );
    assert(
      ticket.numbers[i] <= 40,
      `Wrong ticket format, selected numbers can't be higher than 40, ${ticket.serialize()}`,
    );
  }

  // validate buyer and transfer money
  const buyer = Context.caller().toString();
  const amount = u64.parse(lotto.price.toString()) * 10 ** 9;
  assert(
    Context.transferredCoins() >= amount,
    `Invalid amount in SC call ${Context.transferredCoins()}`,
  );
  transferCoins(Context.callee(), amount);

  // saving ticket, ticket count and lotto deposit in storage
  ticket.address = buyer;
  const ticketCount = u64.parse(Storage.get(TICKET_COUNT));
  const newTicketCount = ticketCount + 1;
  ticket.no = newTicketCount;
  lotto.deposit = lotto.deposit + lotto.price;
  Storage.set(LOTTO_.concat(lottoRoundCount.toString()), lotto.serialize());
  Storage.set(TICKET_.concat(newTicketCount.toString()), ticket.serialize());
  Storage.set(TICKET_COUNT, newTicketCount.toString());
  generateEvent(`New ticket ${newTicketCount} - ${ticket.serialize()} has successfully saved`);
}

export function getTickets(): StaticArray<u8> {
  const response: Ticket[] = [];
  const address = Context.caller().toString();
  const ticketCount = u64.parse(Storage.get(TICKET_COUNT));
  for (let i: u64 = 1; i <= ticketCount; i++) {
    if (Storage.has(TICKET_.concat(i.toString()))) {
      const args = Storage.get(
        TICKET_.concat(i.toString()),
      );
      const ticket = Ticket.deserialize(args);
      if (ticket.address == address) {
        response.push(ticket);
      }
    }
  }

  return stringToBytes(Ticket.serializeArray(response));
}

export function finalizeLotto(): void {
  // validate owner
  const owner = Storage.get(OWNER_KEY);
  assert(
    Context.callee() === Context.caller() || Context.caller().toString() === owner,
    'The caller must be the contract itself',
  );
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  generateEvent(
    `Lottery round ${lottoRoundCount} is over, we start drawing the winning numbers`,
  );

  const args = Storage.get(
    LOTTO_.concat(lottoRoundCount),
  );

  // extract winning numbers and save it
  const lotto = Lotto.deserialize(args);
  const winningNumbers: u8[] = generateUniqueRandomNumbers(1, 40, 5);
  for (let i = 0; i < 5; i++) {
    lotto.winningNumbers.push(winningNumbers[i]);
  }

  let ticketCount = u64.parse(Storage.get(TICKET_COUNT));
  if (ticketCount === 0) {
    generateEvent(`No tickets were sold in lottery round ${lottoRoundCount}`);
  } else {
    for (let i: u64 = 1; i <= ticketCount; i++) {
      if (Storage.has(TICKET_.concat(i.toString()))) {
        const args = Storage.get(
          TICKET_.concat(i.toString()),
        );
        const ticket = Ticket.deserialize(args);
        if (containsCount(lotto.winningNumbers, ticket.numbers, 5)) {
          lotto.winners50.push(ticket);
        } else if (containsCount(lotto.winningNumbers, ticket.numbers, 4)) {
          lotto.winners30.push(ticket);
        } else if (containsCount(lotto.winningNumbers, ticket.numbers, 3)) {
          lotto.winners20.push(ticket);
        }
      }
    }
  }

  lotto.isActive = false;
  Storage.set(
    LOTTO_.concat(lottoRoundCount),
    lotto.serialize(),
  );

  // cleaning old tickets
  generateEvent(`Cleaning ticket storage...`);
  for (let i: u64 = 1; i <= ticketCount; i++) {
    Storage.del(TICKET_.concat(i.toString()));
  }
  Storage.set(TICKET_COUNT, '0');

  // send event in future ti pay winners
  const validityStartPeriodP =
    Context.currentPeriod() + 1;
  const validityEndPeriodP =
    Context.currentPeriod() + 2;
  sendMessage(
    Context.callee(),
    'payWinners50',
    validityStartPeriodP,
    0,
    validityEndPeriodP,
    31,
    MAX_GAS_ASYNC_FT,
    ASC_FEE,
    0,
    new Args().add(lotto.round.toString()).serialize(),
  );
  generateEvent(`Start paying jackpot at ${validityStartPeriodP} - ${validityEndPeriodP} period`);
}

export function payWinners50(binaryArgs: StaticArray<u8>): void {
  const owner = Storage.get(OWNER_KEY);
  assert(
    Context.callee() === Context.caller() || Context.caller().toString() === owner,
    'The caller must be the contract itself',
  );
  generateEvent(`Start paying jackpot winners`);
  const args = new Args(binaryArgs);
  const round = args.nextString().unwrap();

  const lArgs = Storage.get(
    LOTTO_.concat(round),
  );

  const lotto = Lotto.deserialize(lArgs);
  let deposit = <number>lotto.deposit;
  const winnersLength = lotto.winners50.length == 0 ? 1 : lotto.winners50.length;
  let jackpot = u64.parse(Math.floor(deposit * 0.5 / winnersLength).toString());
  generateEvent(`Prize jackpot - ${jackpot} MAS`);
  let tokensWon: u64 = 0;
  if (lotto.winners50.length != 0) {
    let amount = jackpot * 10 ** 9;
    for (let i = 0; i < lotto.winners50.length; i++) {
      generateEvent(`Sending jackpot prize ${amount} MAS to ${lotto.winners50[i].address}`);
      transferCoins(new Address(lotto.winners50[i].address), amount);
      tokensWon = tokensWon + jackpot;
    }
  }
  lotto.winners50Amount = jackpot;
  Storage.set(LOTTO_.concat(round), lotto.serialize());

  generateEvent(`Tokens won at jackpot ${tokensWon}`);

  const validityStartPeriodP =
    Context.currentPeriod() + 1;
  const validityEndPeriodP =
    Context.currentPeriod() + 2;

  sendMessage(
    Context.callee(),
    'payWinners30',
    validityStartPeriodP,
    0,
    validityEndPeriodP,
    31,
    MAX_GAS_ASYNC_FT,
    ASC_FEE,
    0,
    new Args().add(lotto.round.toString()).add(tokensWon.toString()).serialize(),
  );

  generateEvent(`Start paying 30 at ${validityStartPeriodP} - ${validityEndPeriodP} period`);
}

export function payWinners30(binaryArgs: StaticArray<u8>): void {
  const owner = Storage.get(OWNER_KEY);
  assert(
    Context.callee() === Context.caller() || Context.caller().toString() === owner,
    'The caller must be the contract itself',
  );
  generateEvent(`Start paying winners with 4 numbers`);
  const args = new Args(binaryArgs);
  const round = args.nextString().unwrap();
  let sTokensWon = args.nextString().unwrap();
  let tokensWon = u64.parse(sTokensWon);

  const lArgs = Storage.get(
    LOTTO_.concat(round),
  );

  const lotto = Lotto.deserialize(lArgs);
  let deposit = <number>lotto.deposit;
  const winnersLength = lotto.winners30.length == 0 ? 1 : lotto.winners30.length;
  let thirty = u64.parse(Math.floor(deposit * 0.3 / winnersLength).toString());
  generateEvent(`Prize for 4 numbers - ${thirty} MAS`);

  if (lotto.winners30.length != 0) {
    let amount: u64 = thirty * 10 ** 9;
    for (let i = 0; i < lotto.winners30.length; i++) {
      generateEvent(`Sending prize for 4 numbers ${amount} MAS to ${lotto.winners30[i].address}`);
      transferCoins(new Address(lotto.winners30[i].address), amount);
      tokensWon = tokensWon + thirty;
    }
  }
  lotto.winners30Amount = thirty;
  Storage.set(LOTTO_.concat(round), lotto.serialize());

  generateEvent(`Money won at 4 no ${tokensWon}`);

  const validityStartPeriodP =
    Context.currentPeriod() + 1;
  const validityEndPeriodP =
    Context.currentPeriod() + 2;

  sendMessage(
    Context.callee(),
    'payWinners20',
    validityStartPeriodP,
    0,
    validityEndPeriodP,
    31,
    MAX_GAS_ASYNC_FT,
    ASC_FEE,
    0,
    new Args().add(lotto.round.toString()).add(tokensWon.toString()).serialize(),
  );

  generateEvent(`Start paying 20 at ${validityStartPeriodP} - ${validityEndPeriodP} period`);
}

export function payWinners20(binaryArgs: StaticArray<u8>): void {
  const owner = Storage.get(OWNER_KEY);
  assert(
    Context.callee() === Context.caller() || Context.caller().toString() === owner,
    'The caller must be the contract itself',
  );
  generateEvent(`Start paying winners for 3 numbers`);
  const args = new Args(binaryArgs);
  const round = args.nextString().unwrap();
  let sTokensWon = args.nextString().unwrap();
  let tokensWon = u64.parse(sTokensWon);

  const lArgs = Storage.get(
    LOTTO_.concat(round),
  );

  const lotto = Lotto.deserialize(lArgs);
  let deposit = <number>lotto.deposit;
  const winnersLength = lotto.winners20.length == 0 ? 1 : lotto.winners20.length;
  let twenty = u64.parse(Math.floor(deposit * 0.2 / winnersLength).toString());
  generateEvent(`Prize for 3 numbers - ${twenty} MAS`);

  if (lotto.winners20.length != 0) {
    let amount: u64 = twenty * 10 ** 9;
    for (let i = 0; i < lotto.winners20.length; i++) {
      generateEvent(`Sending prize for 3 numbers ${amount} MAS to ${lotto.winners20[i].address}`);
      transferCoins(new Address(lotto.winners20[i].address), amount);
      tokensWon = tokensWon + twenty;
    }
  }
  lotto.winners20Amount = twenty;
  lotto.tokensWon = tokensWon;
  Storage.set(LOTTO_.concat(round), lotto.serialize());

  generateEvent(`Money won at 3 no ${tokensWon}`);

  const initialDeposit = lotto.deposit - tokensWon;

  const remainingDeposit = u64.parse(Math.floor(<number>initialDeposit * 0.95).toString());
  const devsAmount = u64.parse(Math.floor(<number>initialDeposit * 0.05).toString());

  transferCoins(new Address(owner), devsAmount * 10 ** 9);

  generateEvent(`Initial deposit for next round ${remainingDeposit} MAS`);
  generateEvent(`Devs for coffee ${devsAmount} MAS`);

  // send event in future to start new round
  const validityStartPeriodNewRound =
    Context.currentPeriod() + 18;
  const validityEndPeriodNewRound =
    Context.currentPeriod() + 19;
  sendMessage(
    Context.callee(),
    'initLotto',
    validityStartPeriodNewRound,
    0,
    validityEndPeriodNewRound,
    31,
    MAX_GAS_ASYNC_FT,
    ASC_FEE,
    0,
    new Args().add(remainingDeposit.toString()).serialize(),
  );
  generateEvent(`New round will start at ${validityStartPeriodNewRound} - ${validityEndPeriodNewRound} period`);
}

export function adminPayWinner(binaryArgs: StaticArray<u8>): void {
  onlyOwner();

  const args = new Args(binaryArgs);
  const address = args.nextString()
    .expect('Missing first arguments');

  const amount = args.nextString()
    .expect('Missing second arguments');

  transferCoinsOf(new Address(Context.callee().toString()), new Address(address), u64.parse(amount) * 10 ** 9);
}

export function adminUpgradeSmartContract(newBytecode: StaticArray<u8>): void {
  onlyOwner();
  setBytecode(newBytecode);
  generateEvent("Contract successfully updated");
}

// @ts-ignore
@inline
function generateUniqueRandomNumbers(min: u8, max: u8, count: u8): u8[] {
  const numbers: Set<u8> = new Set();

  while (<u8>numbers.size < count) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    numbers.add(<u8>randomNum);
  }

  return numbers.values();
}

// @ts-ignore
@inline
function containsCount(a: u8[], b: u8[], c: u8): bool {
  let count: u8 = 0;

  const bSet = new Set<u8>();
  for (let i = 0; i < b.length; i++) {
    bSet.add(b[i]);
  }

  for (let i = 0; i < a.length; i++) {
    if (bSet.has(a[i])) {
      count++;
    }
  }
  return count === c;
}
