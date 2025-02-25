import { Context, generateEvent, Storage, balanceOf, transferCoins, Address } from '@massalabs/massa-as-sdk';
import { stringToBytes, Args } from '@massalabs/as-types';
import { onlyOwner } from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import { LOTTO_, LOTTO_ROUND_COUNT, OWNER, TICKET_, TICKET_COUNT, TICKET_PRICE } from './utils/tags';
import { Lotto } from './serializable/Lotto';
import { Ticket } from './serializable/Ticket';

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  Storage.set(OWNER, Context.caller().toString());
  Storage.set(LOTTO_ROUND_COUNT, '0');
  Storage.set(TICKET_COUNT, '0');
  Storage.set(TICKET_PRICE, '10');
  initLotto();
}

// @ts-ignore
@inline
function initLotto(): void {
  onlyOwner();
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  const newLottoCount = u64.parse(lottoRoundCount) + 1;
  Storage.set(LOTTO_ROUND_COUNT, newLottoCount.toString());

  const startDate = Date.now();
  const endDate = startDate + 23 * 60 * 60 * 1000;
  const ticketPrice = u8.parse(Storage.get(TICKET_PRICE));
  const lotto = new Lotto(newLottoCount, startDate, endDate, ticketPrice, 0, [], [], [], []);
  Storage.set(
    LOTTO_.concat(newLottoCount.toString()),
    lotto.serialize(),
  );

  generateEvent(`lottery round ${newLottoCount} begins`);
}

export function getTicketPrice(): StaticArray<u8> {
  onlyOwner();
  return stringToBytes(Storage.get(TICKET_PRICE));
}

export function updateTicketPrice(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const price = args.nextString()
    .expect('Missing price');
  Storage.set(TICKET_PRICE, price);
}

export function getCurrentLotto(): StaticArray<u8> {
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  const sLotto = Storage.get(LOTTO_.concat(lottoRoundCount.toString()));
  const lotto = Lotto.deserialize(sLotto);
  const dateNow = Date.now();
  assert(dateNow < lotto.endDate, `Lottery round ${lottoRoundCount} is over`);
  return stringToBytes(sLotto);
}

export function buyTicket(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const sTicket = args.nextString()
    .expect('Missing ticket arguments');
  let ticket = Ticket.deserialize(sTicket);
  assert(ticket.numbers.length === 5, 'Wrong ticket format');
  const b = new Set();
  for (let i = 0; i < ticket.numbers.length; i++) {
    b.add(ticket.numbers[i]);
  }
  assert(b.size === ticket.numbers.length, 'Wrong ticket format, no duplications allowed');
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

  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  const sLotto = Storage.get(LOTTO_.concat(lottoRoundCount.toString()));

  const buyer = Context.caller().toString();
  const lotto = Lotto.deserialize(sLotto);
  const amount = u64.parse(lotto.price.toString()) * 10 ** 8;
  const buyerBalance = balanceOf(buyer);
  assert(
    buyerBalance > amount,
    `Insufficient balance to buy ticket, current balance for ${buyer} is ${buyerBalance}
    , the current price is ${amount}`,
  );
  transferCoins(new Address('AU1jHByejYjrarym3RwcvXk8KAKeXFzpfqPZcH3TirZF5cj5cZKY'), amount);

  ticket.address = buyer;
  const ticketCount = u8.parse(Storage.get(TICKET_COUNT));
  const newTicketCount = ticketCount + 1;
  lotto.deposit = lotto.deposit + lotto.price;
  Storage.set(LOTTO_.concat(lottoRoundCount.toString()), lotto.serialize());
  Storage.set(TICKET_.concat(newTicketCount.toString()), ticket.serialize());
  Storage.set(TICKET_COUNT, newTicketCount.toString());
}

export function getTickets(): StaticArray<u8> {
  const response: Ticket[] = [];
  const address = Context.caller().toString();
  const ticketCount = u8.parse(Storage.get(TICKET_COUNT));
  for (let i: u8 = 1; i <= ticketCount; i++) {
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
  onlyOwner();
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  generateEvent(
    `Lottery round ${lottoRoundCount} is over, we start drawing the winning numbers`,
  );

  const args = Storage.get(
    LOTTO_.concat(lottoRoundCount),
  );

  generateEvent(`${args}`);
  const lotto = Lotto.deserialize(args);
  const winningNumbers: u8[] = generateUniqueRandomNumbers(1, 40, 5);

  lotto.winningNumbers.concat(winningNumbers);
  lotto.winners50.push(new Ticket('1', [1, 2, 3, 4, 5]));
  lotto.winners30.push(new Ticket('1', [1, 2, 3, 4, 5]));
  lotto.winners20.push(new Ticket('1', [1, 2, 3, 4, 5]));

  const ticketCount = u8.parse(Storage.get(TICKET_COUNT));

  if (ticketCount === 0) {
    generateEvent(`No tickets were sold in lottery round ${lottoRoundCount}`);
  } else {
    for (let i: u8 = 1; i <= ticketCount; i++) {
      if (Storage.has(TICKET_.concat(i.toString()))) {
        const args = Storage.get(
          TICKET_.concat(i.toString()),
        );
        const ticket = Ticket.deserialize(args);
        if (containsCount(winningNumbers, ticket.numbers, 5)) {
          lotto.winners50.push(ticket);
        } else if (containsCount(winningNumbers, ticket.numbers, 4)) {
          lotto.winners30.push(ticket);
        } else if (containsCount(winningNumbers, ticket.numbers, 3)) {
          lotto.winners20.push(ticket);
        }
      }
    }
  }

  Storage.set(
    stringToBytes(LOTTO_.concat(lottoRoundCount)),
    stringToBytes(lotto.serialize()),
  );

  generateEvent(`Cleaning ticket storage...`);
  // delete tickets from previous round
  for (let i: u8 = 1; i <= ticketCount; i++) {
    Storage.del(TICKET_.concat(i.toString()));
  }
  Storage.set(TICKET_COUNT, '0');
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
      if (count >= c) {
        return true;
      }
    }
  }

  return false;
}
