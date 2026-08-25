/** Fallback menu when API is unreachable — mirrors backend DEFAULT_GUEST_MENU. */

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
        },
        {
          id: 'item-calamari',
          name: 'Crispy Calamari',
          description: 'Lightly fried, lemon aioli, chili flakes',
          price: '14',
        },
        {
          id: 'item-bruschetta',
          name: 'Tomato Bruschetta',
          description: 'Grilled sourdough, cherry tomatoes, garlic, fresh basil',
          price: '11',
          tags: ['Vegetarian'],
        },
        {
          id: 'item-soup',
          name: 'Tuscan White Bean Soup',
          description: 'Cannellini beans, rosemary, olive oil drizzle',
          price: '10',
          tags: ['Vegetarian'],
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
        },
        {
          id: 'item-risotto',
          name: 'Risotto ai Funghi',
          description: 'Arborio rice, wild mushrooms, thyme, pecorino',
          price: '22',
          tags: ['Popular'],
        },
        {
          id: 'item-carbonara',
          name: 'Classic Carbonara',
          description: 'Guanciale, egg yolk, pecorino romano, black pepper',
          price: '20',
        },
        {
          id: 'item-arrabbiata',
          name: 'Penne Arrabbiata',
          description: 'Spicy tomato sauce, garlic, parsley',
          price: '18',
          tags: ['Spicy', 'Vegetarian'],
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
        },
        {
          id: 'item-branzino',
          name: 'Whole Branzino',
          description: 'Wood-grilled, lemon, herbs, seasonal vegetables',
          price: '34',
        },
        {
          id: 'item-chicken',
          name: 'Chicken Parmigiana',
          description: 'Crispy cutlet, tomato, mozzarella, spaghetti',
          price: '26',
          tags: ['Popular'],
        },
        {
          id: 'item-steak',
          name: 'Ribeye Tagliata',
          description: 'Grilled ribeye, arugula, shaved parmesan, balsamic',
          price: '42',
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
        },
        {
          id: 'item-diavola',
          name: 'Diavola',
          description: 'Spicy salami, chili oil, mozzarella, oregano',
          price: '21',
          tags: ['Spicy'],
        },
        {
          id: 'item-funghi-pizza',
          name: 'Funghi',
          description: 'Wild mushrooms, fontina, rosemary, truffle oil',
          price: '22',
          tags: ['Vegetarian'],
        },
        {
          id: 'item-prosciutto',
          name: 'Prosciutto & Rucola',
          description: 'Prosciutto di Parma, arugula, mozzarella, balsamic',
          price: '24',
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
        },
        {
          id: 'item-panna',
          name: 'Panna Cotta',
          description: 'Vanilla bean, berry compote',
          price: '11',
        },
        {
          id: 'item-gelato',
          name: 'Gelato Trio',
          description: 'Ask your server for today’s flavors',
          price: '10',
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
        },
        {
          id: 'item-aperol',
          name: 'Aperol Spritz',
          description: 'Aperol, prosecco, soda, orange',
          price: '12',
          tags: ['Popular'],
        },
        {
          id: 'item-negroni',
          name: 'Negroni',
          description: 'Gin, Campari, sweet vermouth',
          price: '14',
        },
        {
          id: 'item-house-red',
          name: 'House Red (glass)',
          description: 'Rotating Italian selection',
          price: '11',
        },
        {
          id: 'item-sparkling',
          name: 'Still / Sparkling Water',
          description: '750ml',
          price: '5',
        },
      ],
    },
  ],
};
