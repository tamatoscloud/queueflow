/**
 * Thumbnail for a menu item: the item's own photo when the restaurant set
 * one, otherwise a stock food photo matched from the dish name.
 */
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=240&h=240&q=70`;

const MATCHERS: Array<[RegExp, string]> = [
  [/pizza|margherita/i, '1565299624946-b28f40a0ae38'],
  [/burger|slider/i, '1568901346375-23c9450c58cd'],
  [/carbonara|tagliatelle|spaghetti|linguine|penne|pasta|risotto|gnocchi/i, '1563379926898-05f4575a45d8'],
  [/salad|caprese|burrata|greens/i, '1546069901-ba9599a7e63c'],
  [/soup|bisque|broth/i, '1547592180-85f173990554'],
  [/steak|ribeye|beef|lamb|chop/i, '1600891964092-4316c288032e'],
  [/dessert|cake|tiramisu|gelato|ice cream|brownie|donut|pie|cheesecake/i, '1551024601-bec78aea704b'],
  [/coffee|espresso|latte|cappuccino|tea/i, '1495474472287-4d71bcdd2085'],
];

const FALLBACK = '1504674900247-0877df9cc836';

export function dishImageUrl(item: { name: string; imageUrl?: string }): string {
  const own = item.imageUrl?.trim();
  if (own && /^https:\/\//.test(own)) return own;
  const match = MATCHERS.find(([re]) => re.test(item.name));
  return UNSPLASH(match ? match[1] : FALLBACK);
}
