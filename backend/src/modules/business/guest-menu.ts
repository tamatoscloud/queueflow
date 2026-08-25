/** Shared default restaurant menu used when a business has not saved one yet. */

export type GuestMenuItem = {
  id: string;
  name: string;
  description?: string;
  price: string;
  tags?: string[];
  available?: boolean;
};

export type GuestMenuCategory = {
  id: string;
  name: string;
  items: GuestMenuItem[];
};

export type GuestMenu = {
  categories: GuestMenuCategory[];
};

export const DEFAULT_GUEST_MENU: GuestMenu = {
  categories: [
    {
      id: 'cat-starters',
      name: 'Starters',
      items: [
        {
          id: 'item-burrata',
          name: 'Burrata Caprese',
          description: 'Creamy burrata, heirloom tomatoes, basil oil, aged balsamic',
          price: '16',
          tags: ['Popular'],
          available: true,
        },
        {
          id: 'item-calamari',
          name: 'Crispy Calamari',
          description: 'Lightly fried, lemon aioli, chili flakes',
          price: '14',
          tags: [],
          available: true,
        },
        {
          id: 'item-bruschetta',
          name: 'Tomato Bruschetta',
          description: 'Grilled sourdough, cherry tomatoes, garlic, fresh basil',
          price: '11',
          tags: ['Vegetarian'],
          available: true,
        },
        {
          id: 'item-soup',
          name: 'Tuscan White Bean Soup',
          description: 'Cannellini beans, rosemary, olive oil drizzle',
          price: '10',
          tags: ['Vegetarian'],
          available: true,
        },
      ],
    },
    {
      id: 'cat-pasta',
      name: 'Pasta & Risotto',
      items: [
        {
          id: 'item-truffle',
          name: 'Truffle Pasta',
          description: 'Fresh tagliatelle, black truffle, parmesan cream',
          price: '24',
          tags: ["Chef's pick"],
          available: true,
        },
        {
          id: 'item-risotto',
          name: 'Risotto ai Funghi',
          description: 'Arborio rice, wild mushrooms, thyme, pecorino',
          price: '22',
          tags: ['Popular'],
          available: true,
        },
        {
          id: 'item-carbonara',
          name: 'Classic Carbonara',
          description: 'Guanciale, egg yolk, pecorino romano, black pepper',
          price: '20',
          tags: [],
          available: true,
        },
        {
          id: 'item-arrabbiata',
          name: 'Penne Arrabbiata',
          description: 'Spicy tomato sauce, garlic, parsley',
          price: '18',
          tags: ['Spicy', 'Vegetarian'],
          available: true,
        },
      ],
    },
    {
      id: 'cat-mains',
      name: 'Mains',
      items: [
        {
          id: 'item-osso',
          name: 'Osso Buco',
          description: 'Braised veal shank, saffron risotto, gremolata',
          price: '36',
          tags: ['Signature'],
          available: true,
        },
        {
          id: 'item-branzino',
          name: 'Whole Branzino',
          description: 'Wood-grilled, lemon, herbs, seasonal vegetables',
          price: '34',
          tags: [],
          available: true,
        },
        {
          id: 'item-chicken',
          name: 'Chicken Parmigiana',
          description: 'Crispy cutlet, tomato, mozzarella, spaghetti',
          price: '26',
          tags: ['Popular'],
          available: true,
        },
        {
          id: 'item-steak',
          name: 'Ribeye Tagliata',
          description: 'Grilled ribeye, arugula, shaved parmesan, balsamic',
          price: '42',
          tags: [],
          available: true,
        },
      ],
    },
    {
      id: 'cat-pizza',
      name: 'Wood-Fired Pizza',
      items: [
        {
          id: 'item-margherita',
          name: 'Margherita',
          description: 'San Marzano tomato, fresh mozzarella, basil',
          price: '18',
          tags: ['Popular'],
          available: true,
        },
        {
          id: 'item-diavola',
          name: 'Diavola',
          description: 'Spicy salami, chili oil, mozzarella, oregano',
          price: '21',
          tags: ['Spicy'],
          available: true,
        },
        {
          id: 'item-funghi-pizza',
          name: 'Funghi',
          description: 'Wild mushrooms, fontina, rosemary, truffle oil',
          price: '22',
          tags: ['Vegetarian'],
          available: true,
        },
        {
          id: 'item-prosciutto',
          name: 'Prosciutto & Rucola',
          description: 'Prosciutto di Parma, arugula, mozzarella, balsamic',
          price: '24',
          tags: [],
          available: true,
        },
      ],
    },
    {
      id: 'cat-desserts',
      name: 'Desserts',
      items: [
        {
          id: 'item-tiramisu',
          name: 'Tiramisu',
          description: 'Espresso-soaked ladyfingers, mascarpone, cocoa',
          price: '12',
          tags: ['Popular'],
          available: true,
        },
        {
          id: 'item-panna',
          name: 'Panna Cotta',
          description: 'Vanilla bean, berry compote',
          price: '11',
          tags: [],
          available: true,
        },
        {
          id: 'item-gelato',
          name: 'Gelato Trio',
          description: 'Ask your server for today’s flavors',
          price: '10',
          tags: [],
          available: true,
        },
      ],
    },
    {
      id: 'cat-drinks',
      name: 'Drinks',
      items: [
        {
          id: 'item-espresso',
          name: 'Espresso',
          description: 'Double shot',
          price: '4',
          tags: [],
          available: true,
        },
        {
          id: 'item-aperol',
          name: 'Aperol Spritz',
          description: 'Aperol, prosecco, soda, orange',
          price: '12',
          tags: ['Popular'],
          available: true,
        },
        {
          id: 'item-negroni',
          name: 'Negroni',
          description: 'Gin, Campari, sweet vermouth',
          price: '14',
          tags: [],
          available: true,
        },
        {
          id: 'item-house-red',
          name: 'House Red (glass)',
          description: 'Rotating Italian selection',
          price: '11',
          tags: [],
          available: true,
        },
        {
          id: 'item-sparkling',
          name: 'Still / Sparkling Water',
          description: '750ml',
          price: '5',
          tags: [],
          available: true,
        },
      ],
    },
  ],
};

export function isGuestMenu(value: unknown): value is GuestMenu {
  if (!value || typeof value !== 'object') return false;
  const cats = (value as GuestMenu).categories;
  return Array.isArray(cats);
}

export function normalizeGuestMenu(value: unknown): GuestMenu {
  if (!isGuestMenu(value) || value.categories.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_GUEST_MENU)) as GuestMenu;
  }
  let n = 0;
  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++n}`;
  return {
    categories: value.categories.map((c) => ({
      id: String(c.id || nextId('cat')).slice(0, 64),
      name: String(c.name || 'Category').slice(0, 80),
      items: (c.items ?? []).map((item) => ({
        id: String(item.id || nextId('item')).slice(0, 64),
        name: String(item.name || 'Item').slice(0, 120),
        description: item.description
          ? String(item.description).slice(0, 400)
          : undefined,
        price: String(item.price ?? '0').slice(0, 24),
        tags: Array.isArray(item.tags)
          ? item.tags.map((t) => String(t).slice(0, 40)).slice(0, 8)
          : [],
        available: item.available !== false,
      })),
    })),
  };
}
