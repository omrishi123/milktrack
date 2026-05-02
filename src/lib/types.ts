
export interface Customer {
  id?: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  ownerId: string;
}

export interface MilkEntry {
  id?: string;
  customerName: string;
  date: string;
  timeOfDay: 'Morning' | 'Evening';
  milkQuantity: number;
  price: number;
  total: number;
  paid: boolean;
  ownerId: string;
}

export interface AppSettings {
  sellerName: string;
  defaultPrice: number;
  darkMode: boolean;
  ownerId: string;
}

export interface UserProfile {
  displayName?: string;
  email?: string;
  mobileNumber?: string;
  upiId?: string;
  address?: string;
  photoBase64?: string;
}
