/** Rich demo content for Bella Vista — UI only, no API changes. */

export const RESTAURANT_HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=600&fit=crop&q=80';

export const RESTAURANT_AMBIENCE_IMAGES = [
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550966841-3d63d9b26409?w=800&h=500&fit=crop&q=80',
] as const;

export const TABLE_SIZES = [2, 4, 6, 8] as const;
export type TableSize = (typeof TABLE_SIZES)[number];

export const PEAK_HOUR_TEXT = 'Peak hours: 7–9 PM · Est. wait may be longer';

export const RESTAURANT_TAGLINE =
  'Fine Italian dining with panoramic city views. Join the waitlist and we\'ll text you when your table is ready.';

export const RESTAURANT_RATING = 4.8;
export const RESTAURANT_REVIEW_COUNT = 1247;

export const OPENING_HOURS = 'Mon–Thu 11:30 AM – 10 PM · Fri–Sun 11 AM – 11 PM';
export const RESTAURANT_ADDRESS = '42 Skyline Avenue, Downtown';
export const RESTAURANT_PHONE = '+1-555-0123';

export const TODAY_SPECIALS = [
  { title: 'Truffle Pasta', price: '$24', tag: 'Chef\'s pick' },
  { title: 'Wood-fired Margherita', price: '$18', tag: 'Popular' },
  { title: 'Tiramisu', price: '$12', tag: 'Dessert' },
] as const;

export const POPULAR_DISHES = [
  { name: 'Osso Buco', image: 'https://images.unsplash.com/photo-1476124366831-4b9dddf1a423?w=400&h=300&fit=crop&q=80' },
  { name: 'Risotto ai Funghi', image: 'https://images.unsplash.com/photo-1473093295047-8dd127f316fd?w=400&h=300&fit=crop&q=80' },
  { name: 'Burrata Caprese', image: 'https://images.unsplash.com/photo-1608897012299-23a2a4f1e79d?w=400&h=300&fit=crop&q=80' },
] as const;

export const GOOGLE_REVIEW_SNIPPET = {
  author: 'Sarah M.',
  text: 'Best Italian in the city. The waitlist system made our anniversary seamless!',
  stars: 5,
} as const;

export const MENU_TIPS = [
  'Browse the bar menu while you wait — we\'ll text when ready.',
  'Ask about our wine pairing with tonight\'s specials.',
  'Kids menu available — mention at check-in.',
] as const;

export function isRestaurantDemo(businessName: string): boolean {
  void businessName;
  // Never overlay Bella Vista demo copy on live join/track screens.
  return false;
}

/** Busy level from waiting count — visual only. */
export function busyLevel(waitingCount: number): 'quiet' | 'moderate' | 'busy' | 'very_busy' {
  if (waitingCount <= 5) return 'quiet';
  if (waitingCount <= 15) return 'moderate';
  if (waitingCount <= 30) return 'busy';
  return 'very_busy';
}

export const BUSY_LABELS: Record<ReturnType<typeof busyLevel>, string> = {
  quiet: 'Not busy',
  moderate: 'Moderate',
  busy: 'Busy',
  very_busy: 'Very busy',
};

export function smartWaitMessage(
  status: string,
  customersAhead: number,
): string {
  if (status === 'CALLED') return 'Your table is ready — head to reception!';
  if (customersAhead === 0) return "You're next! We're preparing your table.";
  if (customersAhead === 1) return 'Almost there — one party ahead of you.';
  if (customersAhead <= 3) return "We're getting close — hang tight!";
  return "We're preparing your table. Thanks for your patience!";
}
