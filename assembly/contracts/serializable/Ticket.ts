import { JSON } from 'json-as';

@json
export class Ticket {
  address: string;
  numbers: u8[];
  no: u64;

  constructor(address: string, numbers: u8[], no: u64) {
    this.address = address;
    this.numbers = numbers;
    this.no = no;
  }

  public serialize(): string {
    return JSON.stringify(this);
  }

  public static serializeArray(tickets: Ticket[]): string {
    return JSON.stringify(tickets);
  }

  public static deserialize(data: string): Ticket {
    return JSON.parse<Ticket>(data);
  }
}
