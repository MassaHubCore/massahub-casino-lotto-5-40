import { JSON } from 'json-as/assembly';
import { Ticket } from './Ticket';

@json
export class Lotto {
  round: u64;
  startDate: i64;
  endDate: i64;
  price: u64;
  deposit: u64;
  initialDeposit: u64;
  tokensWon: u64 = 0;
  winningNumbers: u8[] = [];
  winners50: Ticket[] = [];
  winners50Amount: u64 = 0;
  winners30: Ticket[] = [];
  winners30Amount: u64 = 0;
  winners20: Ticket[] = [];
  winners20Amount: u64 = 0;
  isActive: boolean = true;

  constructor(
    round: u64,
    startDate: u64,
    endDate: u64,
    price: u64,
    deposit: u64,
    initialDeposit: u64,
  ) {
    this.round = round;
    this.startDate = startDate;
    this.endDate = endDate;
    this.price = price;
    this.deposit = deposit;
    this.initialDeposit = initialDeposit;
  }

  public static deserialize(data: string): Lotto {
    return JSON.parse<Lotto>(data);
  }

  public static serializeArray(lotto: Lotto[]): string {
    return JSON.stringify(lotto);
  }

  public serialize(): string {
    return JSON.stringify(this);
  }
}
