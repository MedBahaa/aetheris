export interface UserProfileData {
  initial_capital: number;
  subscription_tier: 'free' | 'premium' | string;
  telegram_chat_id?: string;
  telegram_verified?: boolean;
  whatsapp_phone?: string;
  whatsapp_verified?: boolean;
  alert_channel?: string;
  notification_email?: string;
  username?: string;
  virtual_initial_capital?: number;
  virtual_balance?: number;
}
