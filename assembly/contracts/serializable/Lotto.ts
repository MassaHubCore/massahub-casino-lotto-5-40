import { JSON } from 'json-as/assembly';
import { Ticket } from './Ticket';

@json
export class Lotto {
  round: u64;
  startDate: i64;
  endDate: i64;
  price: u8;
  deposit: u64;
  winningNumbers: u8[];
  winners50: Ticket[];
  winners30: Ticket[];
  winners20: Ticket[];

  constructor(
    round: u64,
    startDate: u64,
    endDate: u64,
    price: u8,
    deposit: u64,
    winningNumbers: u8[],
    winners50: Ticket[],
    winners30: Ticket[],
    winners20: Ticket[],
  ) {
    this.round = round;
    this.startDate = startDate;
    this.endDate = endDate;
    this.price = price;
    this.deposit = deposit;
    this.winningNumbers = winningNumbers;
    this.winners50 = winners50;
    this.winners30 = winners30;
    this.winners20 = winners20;
  }

  public static deserialize(data: string): Lotto {
    return JSON.parse<Lotto>(data);
  }

  public serialize(): string {
    return JSON.stringify(this);
  }

  public static serializeArray(lotto: Lotto[]): string {
    return JSON.stringify(lotto);
  }
}
