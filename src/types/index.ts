export type Category = string; // categories are owner-managed data (Admin > Categories)

export type Gender = 'Men' | 'Women' | 'Unisex';

export interface Product {
  colors?: string[];
  isAvailable?: boolean;
  id: string;
  name: string;
  slug: string;
  category: Category;
  gender: Gender;
  description: string;
  price: number; // in PKR or USD base
  originalPrice?: number;
  isSale?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  images: string[];
  sizes: string[];
  stock: number;
  sku: string;
  details: string[];
  materials: string;
  createdAt: string;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa' | 'card';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  size: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    notes?: string;
  };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: 'unpaid' | 'pending_verification' | 'paid' | 'failed' | 'refunded';
  paymentDetails?: {
    transactionId?: string;
    senderNumber?: string;
    cardLast4?: string;
    notes?: string;
  };
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'customer' | 'admin';
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: string;
}

export interface StoreSettings {
  announcementBanner: string;
  bannerEnabled: boolean;
  jazzcashNumber: string;
  jazzcashTitle: string;
  easypaisaNumber: string;
  easypaisaTitle: string;
  jazzcashInstructions?: string;
  easypaisaInstructions?: string;
  homepageBanner?: { imageUrl?: string; title?: string; subtitle?: string; linkText?: string };
  promo?: { imageUrl?: string; title?: string; text?: string };
  contact?: { email?: string; phone?: string; address?: string };
  socialLinks: {
    instagram: string;
    twitter: string;
    tiktok: string;
    whatsapp: string;
  };
  homepageVideo: {
    enabled: boolean;
    videoUrl: string;
    title: string;
    subtitle: string;
    buttonText: string;
  };
  theme: {
    primaryColor: string;
    accentColor: string;
    fontStyle: string;
  };
  currency: string;
  currencySymbol: string;
}

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}
