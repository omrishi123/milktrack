export interface Customer {
  id: string;
  name: string;
}

export interface MilkEntry {
  id: number;
  customerName: string;
  date: string; // YYYY-MM-DD
  timeOfDay: 'Morning' | 'Evening';
  milkQuantity: number;
  price: number;
  total: number;
  paid: boolean;
}

export interface AppSettings {
  sellerName: string;
  defaultPrice: number;
  darkMode: boolean;
}