export interface Customer {
  id?: string;
  name: string;
  phoneNumber?: string;
  phoneSanitized?: string; // Standardized E.164 format
  address?: string;
  ownerId: string;
}

export interface MilkEntry {
  id?: string;
  customerName: string;
  customerPhoneNumber?: string; // Links entry to a customer login
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
  uid?: string; // Added to help customers find owner info
  displayName?: string;
  email?: string;
  mobileNumber?: string;
  upiId?: string;
  address?: string;
  photoBase64?: string;
  businessLogoBase64?: string;
}

export interface CustomerPurchase {
  ownerId: string;
  ownerProfile?: UserProfile;
  ownerSettings?: AppSettings;
  entries: MilkEntry[];
}
