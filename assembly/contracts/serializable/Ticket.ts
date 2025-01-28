import { JSON } from 'json-as';

@json
export class Ticket {
  address: string;
  numbers: u8[];

  constructor(address: string, numbers: u8[]) {
    this.address = address;
    this.numbers = numbers;
  }

  public serialize(): string {
    return JSON.stringify(this);
  }

  public static deserialize(data: string): Ticket {
    return JSON.parse<Ticket>(data);
  }
}