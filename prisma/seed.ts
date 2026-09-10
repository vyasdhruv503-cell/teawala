import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed database operation...');

  // 1. Get or Create Default Cafe (Non-destructive to protect custom database data & images)
  let cafe = await prisma.cafe.findFirst({
    where: { name: 'TeaWala' },
  });

  if (!cafe) {
    cafe = await prisma.cafe.create({
      data: {
        name: 'TeaWala',
        logo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&auto=format&fit=crop&q=80',
        address: '123 Gourmet Street, Culinary Quarter',
        phone: '+1 (555) 234-5678',
        email: 'hello@mycafe.com',
        taxRate: 5.0,
        currency: '₹',
        openHours: '8:00 AM - 10:00 PM',
      },
    });
    console.log(`✅ Created Cafe: ${cafe.name} (${cafe.id})`);
  } else {
    console.log(`ℹ️  Preserving existing Cafe: ${cafe.name} (${cafe.id})`);
  }

  // 2. Get or Create Admin & Kitchen Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const kitchenPassword = await bcrypt.hash('kitchen123', 10);

  let admin = await prisma.user.findUnique({ where: { email: 'admin@cafeqr.com' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        cafeId: cafe.id,
        name: 'Cafe Admin Manager',
        email: 'admin@cafeqr.com',
        password: adminPassword,
        role: 'ADMIN',
      },
    });
    console.log(`✅ Created Admin User: ${admin.email}`);
  }

  let kitchen = await prisma.user.findUnique({ where: { email: 'kitchen@cafeqr.com' } });
  if (!kitchen) {
    kitchen = await prisma.user.create({
      data: {
        cafeId: cafe.id,
        name: 'Head Chef',
        email: 'kitchen@cafeqr.com',
        password: kitchenPassword,
        role: 'KITCHEN',
      },
    });
    console.log(`✅ Created Kitchen User: ${kitchen.email}`);
  }

  // 3. Get or Create Cafe Tables with Secure QR Tokens
  const tableNumbers = ['Table 01', 'Table 02', 'Table 03', 'Table 04', 'Table 05', 'Table 06'];
  const tables = [];

  for (let i = 0; i < tableNumbers.length; i++) {
    const num = tableNumbers[i];
    let table = await prisma.cafeTable.findFirst({
      where: { cafeId: cafe.id, number: num },
    });
    if (!table) {
      const qrToken = i === 0 ? 'tok_table01_demo' : `tok_${crypto.randomBytes(12).toString('hex')}`;
      table = await prisma.cafeTable.create({
        data: {
          cafeId: cafe.id,
          number: num,
          capacity: 4,
          qrToken,
          isActive: true,
        },
      });
    }
    tables.push(table);
  }

  console.log(`✅ Table setup verified (${tables.length} tables active)`);

  // 5. Create Categories
  const categoryData = [
    {
      name: 'Milk Tea',
      description: 'Traditional spiced milk teas & aromatic herbal tea blends',
      sortOrder: 1,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'No Milk Tea',
      description: 'Refreshing black teas, green teas & herbal kahwa infusions',
      sortOrder: 2,
      image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Café Addiction',
      description: 'Signature hot & chilled coffees, flavored coffees & hot chocolate',
      sortOrder: 3,
      image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Milkshakes',
      description: 'Thick, creamy & refreshing artisanal milkshakes',
      sortOrder: 4,
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Ice Tea',
      description: 'Chilled fruit & herbal infused refreshing iced teas',
      sortOrder: 5,
      image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Milk Preparation',
      description: 'Traditional spiced, malted & saffron infused warm/cold milk',
      sortOrder: 6,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Maggi',
      description: 'Hot, cheesy, buttery & spiced instant Maggi noodles bowls',
      sortOrder: 7,
      image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Bread Item',
      description: 'Maska bun, butter toast, masala cheese toast & cheesy garlic bread',
      sortOrder: 8,
      image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Sandwiches',
      description: 'Freshly grilled paninis, cheese chutney & layered club sandwiches',
      sortOrder: 9,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Healthy Snack',
      description: 'Fresh Gujarati methi thepla with pickle, hot rava upma & masala oats',
      sortOrder: 10,
      image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Frankies & Burger',
      description: 'Crispy veg & paneer frankie rolls, Schezwan rolls & loaded gourmet burgers',
      sortOrder: 11,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Sidekicks',
      description: 'Zesty Jaljira, chilled lemonades & refreshing lime drinks',
      sortOrder: 12,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Side Snack',
      description: 'French fries, nachos, samosas, wafers & crispy snacks (Add Cheese 20/- Extra)',
      sortOrder: 13,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Main Course',
      description: 'Hearty bowls, pastas, and signature savory platters',
      sortOrder: 14,
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
    },
  ];

  // Remove Pizza, Drinks, Desserts, and Starters categories & products if existing in DB
  const categoriesToRemove = ['Pizza', 'Drinks', 'Drink', 'Desserts', 'Dessert', 'Starters', 'Starter'];
  const removedCats = await prisma.category.findMany({
    where: { cafeId: cafe.id, name: { in: categoriesToRemove } },
    select: { id: true, name: true },
  });
  if (removedCats.length > 0) {
    const removedCatIds = removedCats.map((c) => c.id);
    await prisma.product.deleteMany({
      where: { categoryId: { in: removedCatIds } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: removedCatIds } },
    });
    console.log(`🗑️ Removed categories & their products: ${removedCats.map((c) => c.name).join(', ')}`);
  }


  const categoryMap = new Map();

  for (const cat of categoryData) {
    let catRecord = await prisma.category.findFirst({
      where: { cafeId: cafe.id, name: cat.name },
    });
    if (!catRecord) {
      catRecord = await prisma.category.create({
        data: {
          cafeId: cafe.id,
          name: cat.name,
          description: cat.description,
          sortOrder: cat.sortOrder,
          image: cat.image,
          isActive: true,
        },
      });
    } else if (!catRecord.image && cat.image) {
      catRecord = await prisma.category.update({
        where: { id: catRecord.id },
        data: { image: cat.image },
      });
    }
    categoryMap.set(cat.name, catRecord.id);
  }

  console.log(`✅ Category setup verified (${categoryMap.size} Categories active)`);

  // 6. Create Products
  const productsData = [
    // Milk Tea
    {
      category: 'Milk Tea',
      name: 'Traditional Tea (Half)',
      description: 'Classic cutting chai brewed with milk, cardamom & tea leaves (Half cup)',
      price: 12.0,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Traditional Tea (Full)',
      description: 'Classic rich milk tea brewed with cardamom & tea leaves (Full cup)',
      price: 20.0,
      image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Ginger Tea',
      description: 'Steaming hot milk tea infused with freshly grated crushed ginger',
      price: 35.0,
      image: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Elaichi Tea',
      description: 'Aromatic milk tea brewed with fragrant green cardamom pods',
      price: 35.0,
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Phudina Tea',
      description: 'Refreshing hot milk tea infused with fresh garden mint leaves',
      price: 35.0,
      image: 'https://images.unsplash.com/photo-1571934811356-5cc561db1986?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Cinnamon Tea',
      description: 'Warm spiced milk tea infused with sweet cinnamon bark',
      price: 35.0,
      image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc86de5?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Pahadi Tea',
      description: 'Traditional mountain style spiced herbal milk tea blend',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1576092762791-dd9e2220abd1?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Sugar Free Tea',
      description: 'Healthy brewed milk tea prepared without added refined sugar',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1546852199-2d18bb1f60fa?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Your Choice Tea',
      description: 'Customized tea with choice of add-ons (Ginger, Elaichi, Phudina, Clove, Black Pepper, Cinnamon)',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Chocolate Tea',
      description: 'Delicious fusion of rich cocoa and traditional hot chai',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Saffron Tea',
      description: 'Royal milk tea infused with premium golden saffron strands',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Lemon Grass Tea',
      description: 'Aromatic & soothing milk tea brewed with fresh lemongrass',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Tea',
      name: 'Teawala Special',
      description: 'Signature house special kulhad chai loaded with secret spices & saffron',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },

    // No Milk Tea
    {
      category: 'No Milk Tea',
      name: 'Black Tea',
      description: 'Pure brewed black tea with option to select spice add-ons',
      price: 20.0,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 4,
    },
    {
      category: 'No Milk Tea',
      name: 'Hot Honey Lemon Tea',
      description: 'Soothe your throat with warm water, natural honey, black tea & lemon juice',
      price: 30.0,
      image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 4,
    },
    {
      category: 'No Milk Tea',
      name: 'Green Tea',
      description: 'Antioxidant rich whole leaf organic green tea brew',
      price: 35.0,
      image: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 4,
    },
    {
      category: 'No Milk Tea',
      name: 'Desi Kahwo',
      description: 'Traditional Kashmiri kahwa green tea infused with saffron, cardamom & almonds',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },

    // Café Addiction
    {
      category: 'Café Addiction',
      name: 'Black Coffee',
      description: 'Rich black coffee brewed to perfection',
      price: 25.0,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Hot Coffee',
      description: 'Classic hot brewed coffee',
      price: 30.0,
      image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Elaichi Coffee',
      description: 'Traditional cardamom infused hot coffee',
      price: 30.0,
      image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Kesar Coffee',
      description: 'Premium saffron infused aromatic coffee',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Berry Coffee',
      description: 'Refreshing berry infused coffee blend',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Vanilla Coffee',
      description: 'Smooth vanilla flavored coffee',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Coco Mint Coffee',
      description: 'Refreshing mint with rich cocoa and coffee',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Choco Orange Coffee',
      description: 'Zesty orange paired with dark chocolate coffee',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1589396575653-c09c794ff6a6?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Hot Chocolate',
      description: 'Rich, velvety hot chocolate',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 7,
    },
    {
      category: 'Café Addiction',
      name: 'Cold Coffee',
      description: 'Classic chilled blended iced coffee',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Chocolate Coffee (Hot)',
      description: 'Delicious hot chocolate coffee',
      price: 45.0,
      image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Chocolate Coffee (Cold)',
      description: 'Chilled chocolate coffee blend',
      price: 65.0,
      image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Hazelnut Coffee (Hot)',
      description: 'Warm nutty hazelnut coffee',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Hazelnut Coffee (Cold)',
      description: 'Chilled creamy hazelnut iced coffee',
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Caramel Coffee (Hot)',
      description: 'Warm buttery caramel coffee',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1589396575653-c09c794ff6a6?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Caramel Coffee (Cold)',
      description: 'Chilled caramel coffee delight',
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Café Addiction',
      name: 'Cold Coffee with Ice Cream',
      description: 'Creamy cold coffee topped with vanilla ice cream scoop',
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 7,
    },
    {
      category: 'Café Addiction',
      name: 'Cold Coffee with Bournvita',
      description: 'Chilled coffee blended with malted chocolate Bournvita',
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Café Addiction',
      name: 'Oreo Crunchy Frappe',
      description: 'Thick blended coffee frappe loaded with crunchy Oreo cookies',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },

    // Milkshakes
    {
      category: 'Milkshakes',
      name: 'Vanilla Milkshake',
      description: 'Classic creamy vanilla thick shake',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Chocolate Milkshake',
      description: 'Rich Belgian chocolate thick shake',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Strawberry Milkshake',
      description: 'Fresh strawberry flavored thick shake',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Mango Milkshake',
      description: 'Delicious Alphonso mango thick shake',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bcc4?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Watermelon Milkshake',
      description: 'Refreshing watermelon milk drink',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Pineapple Milkshake',
      description: 'Tropical pineapple thick shake',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Coffee Milkshake',
      description: 'Rich espresso coffee thick shake',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Bournvita Milkshake',
      description: 'Malted chocolate Bournvita thick shake',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Badam Milkshake',
      description: 'Nutritious almond badam thick shake',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Milkshakes',
      name: 'Kitkat Shake',
      description: 'Thick milkshake blended with crispy KitKat wafers',
      price: 110.0,
      image: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Milkshakes',
      name: 'Kitkat Coffee Shake',
      description: 'Signature KitKat shake infused with an espresso shot',
      price: 120.0,
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },

    // Ice Tea
    {
      category: 'Ice Tea',
      name: 'Lemon Ice Tea',
      description: 'Refreshing zesty lemon infused iced tea',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Ice Tea',
      name: 'Orange Ice Tea',
      description: 'Tangy orange flavored iced tea',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Ice Tea',
      name: 'Strawberry Ice Tea',
      description: 'Sweet strawberry infused iced tea',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Ice Tea',
      name: 'Peach Ice Tea',
      description: 'Classic sweet peach iced tea',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Ice Tea',
      name: 'Khus & Sauf Ice Tea',
      description: 'Traditional herbal khus & fennel cooling iced tea',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Ice Tea',
      name: 'Aloe Vera & Litchi Ice Tea',
      description: 'Exotic litchi & aloe vera cooling iced tea',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },

    // Milk Preparation
    {
      category: 'Milk Preparation',
      name: 'Masala Milk',
      description: 'Aromatic spiced hot milk infused with saffron & nuts',
      price: 35.0,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Preparation',
      name: 'Bournvita Milk (Hot)',
      description: 'Comforting hot chocolate malted Bournvita milk',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Milk Preparation',
      name: 'Bournvita Milk (Cold)',
      description: 'Chilled chocolate malted Bournvita milk',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Milk Preparation',
      name: 'Badam Milk',
      description: 'Rich almond infused milk with cardamom',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Milk Preparation',
      name: 'Kesarwala Milk',
      description: 'Premium saffron infused sweet milk topped with pistachios',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },

    // Maggi
    {
      category: 'Maggi',
      name: 'Masala Maggi',
      description: 'Classic spiced Indian street-style Masala Maggi noodles',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 10,
    },
    {
      category: 'Maggi',
      name: 'Soupy Maggi',
      description: 'Hot & comforting soupy broth Maggi noodles',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 10,
    },
    {
      category: 'Maggi',
      name: 'Schezwan Maggi',
      description: 'Spicy Schezwan sauce tossed noodles loaded with chili peppers',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 10,
    },
    {
      category: 'Maggi',
      name: 'Butter Maggi',
      description: 'Rich & creamy Maggi cooked with a generous dollop of butter',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 10,
    },
    {
      category: 'Maggi',
      name: 'Buttery Red Chilly Maggi',
      description: 'Spicy red chili flakes infused with melted butter Maggi noodles',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 10,
    },
    {
      category: 'Maggi',
      name: 'Buttery Sweet Corn Maggi',
      description: 'Sweet corn kernels tossed with butter & aromatic Maggi noodles',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 10,
    },
    {
      category: 'Maggi',
      name: 'Tandoori Maggi',
      description: 'Smoky tandoori masala seasoned cheesy Maggi noodles bowl',
      price: 60.0,
      image: '/tandoori-maggi.jpg',
      isVeg: true,
      isFeatured: true,
      preparationTime: 12,
    },
    {
      category: 'Maggi',
      name: 'Veg. Maggi',
      description: 'Loaded with fresh bell peppers, peas, carrots & onions',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 10,
    },
    {
      category: 'Maggi',
      name: 'Italian Maggi (White Sauce)',
      description: 'Decadent pasta-style Maggi cooked in rich garlic cream & cheese white sauce',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 12,
    },

    // Sidekicks
    {
      category: 'Sidekicks',
      name: 'Jaljira',
      description: 'Refreshing tangy Indian spiced cumin Jaljira refresher',
      price: 25.0,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 3,
    },
    {
      category: 'Sidekicks',
      name: 'Lemonade',
      description: 'Freshly squeezed chilled lemon juice drink',
      price: 30.0,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 3,
    },
    {
      category: 'Sidekicks',
      name: 'Twisted Phudina Lime Drink',
      description: 'Sparkling lime beverage twisted with fresh garden mint leaves',
      price: 45.0,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 4,
    },

    // Side Snack
    {
      category: 'Side Snack',
      name: 'Milk Toast (4 Piece)',
      description: 'Crispy sweet baked milk toast slices (4 pieces)',
      price: 20.0,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 5,
    },
    {
      category: 'Side Snack',
      name: 'Wafer (Banana/Potato)',
      description: 'Crispy salted potato or sweet banana wafers pack',
      price: 20.0,
      image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 2,
    },
    {
      category: 'Side Snack',
      name: 'Chocolate Cookies',
      description: 'Freshly baked rich chocolate chip cookies',
      price: 25.0,
      image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 2,
    },
    {
      category: 'Side Snack',
      name: 'Methi Bhakhri',
      description: 'Traditional Gujarati crispy fenugreek whole wheat bhakhri',
      price: 25.0,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 3,
    },
    {
      category: 'Side Snack',
      name: 'Samosa (2 Piece)',
      description: 'Golden crispy potato & pea stuffed samosas served with chutney (2 pieces)',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Side Snack',
      name: 'Pizza Pocket',
      description: 'Cheesy pizza stuffed fried pastry pockets',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Side Snack',
      name: 'French Fries',
      description: 'Golden crispy salted potato fries',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Side Snack',
      name: 'Peri Peri Fries',
      description: 'Crispy French fries tossed in fiery Peri Peri seasoning',
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Side Snack',
      name: 'Cheesy Fries',
      description: 'Crispy French fries smothered in warm liquid cheese sauce',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 10,
    },
    {
      category: 'Side Snack',
      name: 'Peri Peri Cheesy Fries',
      description: 'Peri Peri seasoned fries loaded with melted cheese',
      price: 90.0,
      image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 10,
    },
    {
      category: 'Side Snack',
      name: 'Smily',
      description: 'Golden deep fried potato smiley faces',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 8,
    },
    {
      category: 'Side Snack',
      name: 'Peri Peri Smily',
      description: 'Crispy potato smileys tossed in spicy Peri Peri masala',
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 8,
    },
    {
      category: 'Side Snack',
      name: 'Veggie Finger (4 Piece)',
      description: 'Crispy fried vegetable finger sticks (4 pieces)',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 8,
    },
    {
      category: 'Side Snack',
      name: 'Nachos',
      description: 'Crispy Mexican corn tortilla chips with spicy tomato salsa',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Side Snack',
      name: 'Cheesy Nachos',
      description: 'Tortilla nachos loaded with warm melted cheese & jalapenos',
      price: 100.0,
      image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 6,
    },

    // Bread Item
    {
      category: 'Bread Item',
      name: 'Maska Bun',
      description: 'Soft Irani bun sliced & generously spread with salted butter',
      price: 30.0,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Bread Item',
      name: 'Bread Butter',
      description: 'Fresh bread slices buttered to perfection',
      price: 35.0,
      image: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 4,
    },
    {
      category: 'Bread Item',
      name: 'Bread Jam',
      description: 'Fresh bread slices spread with sweet mixed fruit jam',
      price: 35.0,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 4,
    },
    {
      category: 'Bread Item',
      name: 'Grilled Bread Butter',
      description: 'Golden grilled sandwich bread with rich butter',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 6,
    },
    {
      category: 'Bread Item',
      name: 'Masala Cheese Toast',
      description: 'Crispy toast stuffed with spicy vegetable masala & melted cheese',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Bread Item',
      name: 'Cheese Garlic Bread',
      description: 'Toasted baguette slices brushed with garlic butter & melted mozzarella cheese',
      price: 80.0,
      image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 10,
    },

    // Sandwiches
    {
      category: 'Sandwiches',
      name: 'Samosa Sandwich',
      description: 'Golden samosas smashed & toasted between bread slices with spicy mint chutney',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 7,
    },
    {
      category: 'Sandwiches',
      name: 'Aaloo Mutter Sandwich',
      description: 'Spiced potato & green peas masala grilled sandwich',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 6,
    },
    {
      category: 'Sandwiches',
      name: 'Burger Tikka Sandwich',
      description: 'Smoky paneer tikka patty layered with veggies & burger sauce in grilled sandwich',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Sandwiches',
      name: 'Cheese Grilled Sandwich',
      description: 'Crispy butter toasted sandwich stuffed with gooey melted cheese',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 6,
    },
    {
      category: 'Sandwiches',
      name: 'Cheese Chutney',
      description: 'Fresh mint coriander spicy chutney & melted cheese slice sandwich',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Sandwiches',
      name: 'Veg Grilled Sandwich',
      description: 'Layered cucumbers, tomatoes, onions & capsicum grilled with butter',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 6,
    },
    {
      category: 'Sandwiches',
      name: 'Veg Grilled Schezwan',
      description: 'Mixed vegetable grilled sandwich tossed in fiery Schezwan chili sauce',
      price: 90.0,
      image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Sandwiches',
      name: 'Mexican Paneer',
      description: 'Mexican seasoned diced paneer, sweet corn & bell peppers grilled toast',
      price: 90.0,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Sandwiches',
      name: 'Veg Cheese Schezwan',
      description: 'Loaded vegetables, spicy Schezwan sauce & double melted cheese grilled toast',
      price: 100.0,
      image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Sandwiches',
      name: 'Mexican Mayo',
      description: 'Creamy Mexican spiced mayo, crisp vegetables & melted cheese sandwich',
      price: 100.0,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 8,
    },
    {
      category: 'Sandwiches',
      name: 'Veg Cheesy Kabab (3 Layer)',
      description: 'Triple decker 3-layer club sandwich packed with vegetable kabab & melted cheese',
      price: 110.0,
      image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 10,
    },

    // Healthy Snack
    {
      category: 'Healthy Snack',
      name: 'Thepla (With Pickle)',
      description: 'Freshly roasted Gujarati methi fenugreek whole wheat thepla served with spicy pickle',
      price: 30.0,
      image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 5,
    },
    {
      category: 'Healthy Snack',
      name: 'Upma',
      description: 'Hot roasted semolina rava upma tempered with mustard seeds, curry leaves & roasted peanuts',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 7,
    },
    {
      category: 'Healthy Snack',
      name: 'Oats',
      description: 'Warm & nutritious savory vegetable masala oats bowl',
      price: 40.0,
      image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 7,
    },

    // Frankies & Burger
    {
      category: 'Frankies & Burger',
      name: 'Veg. Frankie',
      description: 'Crispy spiced potato patty & fresh veggie roll seasoned with chaat masala',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 7,
    },
    {
      category: 'Frankies & Burger',
      name: 'Schezwan Frankie',
      description: 'Spicy Schezwan sauce tossed noodles & vegetable frankie roll',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 7,
    },
    {
      category: 'Frankies & Burger',
      name: 'Tandoori Mayo',
      description: 'Smoky tandoori mayonnaise infused vegetable roll frankie',
      price: 60.0,
      image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 7,
    },
    {
      category: 'Frankies & Burger',
      name: 'Paneer Frankie',
      description: 'Marinated paneer tikka cubes & crunchy onions stuffed frankie roll',
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Frankies & Burger',
      name: 'Mexican Frankie',
      description: 'Mexican seasoned sweet corn, beans & salsa filled frankie roll',
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 8,
    },
    {
      category: 'Frankies & Burger',
      name: 'Veg Burger',
      description: 'Golden crispy vegetable patty burger layered with fresh lettuce & mayo',
      price: 45.0,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Frankies & Burger',
      name: 'Schezwan Burger',
      description: 'Crispy veg patty burger coated with spicy Schezwan sauce & cheese',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },
    {
      category: 'Frankies & Burger',
      name: 'Tandoori Burger',
      description: 'Smoky tandoori sauce drenched crispy veg patty burger',
      price: 50.0,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: true,
      preparationTime: 8,
    },

    // Burger
    {
      category: 'Burger',
      name: 'Classic Smash Cheeseburger',
      description: 'Double Angus beef patties, melted American cheese, house special sauce & pickles on toasted brioche.',
      price: 289.0,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      isVeg: false,
      isFeatured: true,
      preparationTime: 15,
    },
    {
      category: 'Burger',
      name: 'Crispy Avocado Veggie Burger',
      description: 'Golden quinoa & chickpea patty, fresh avocado slices, chipotle aioli, and crisp butter lettuce.',
      price: 249.0,
      image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 15,
    },
    {
      category: 'Burger',
      name: 'Spicy Buffalo Chicken Burger',
      description: 'Crispy fried chicken breast dipped in fiery buffalo glaze, topped with creamy blue cheese slaw.',
      price: 319.0,
      image: 'https://images.unsplash.com/photo-1615297928064-24977384d0da?w=500&auto=format&fit=crop&q=80',
      isVeg: false,
      isFeatured: true,
      preparationTime: 16,
    },

    // Sandwich
    {
      category: 'Sandwich',
      name: 'Pesto Grilled Mozzarella Panini',
      description: 'Artisanal sourdough stuffed with sun-dried tomato pesto, mozzarella, and fresh arugula.',
      price: 219.0,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 12,
    },
    {
      category: 'Sandwich',
      name: 'Triple Decker Turkey Club',
      description: 'Smoked turkey breast, crispy turkey bacon, heirloom tomatoes, avocado, and herb mayo on sourdough.',
      price: 279.0,
      image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=80',
      isVeg: false,
      isFeatured: false,
      preparationTime: 14,
    },
    {
      category: 'Sandwich',
      name: 'Mediterranean Grilled Veggie Sub',
      description: 'Charred zucchini, bell peppers, feta cheese, and olive tapenade inside crusty baguette.',
      price: 199.0,
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 10,
    },

    // Main Course
    {
      category: 'Main Course',
      name: 'Creamy Alfredo Penne Pasta',
      description: 'Penne tossed in garlic parmesan cream sauce, roasted garlic, parmesan shavings & garlic toast.',
      price: 329.0,
      image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 18,
    },
    {
      category: 'Main Course',
      name: 'Grilled Herb Butter Chicken Rice Bowl',
      description: 'Marinated tender chicken breast over jasmine rice with grilled asparagus and lemon herb dressing.',
      price: 389.0,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
      isVeg: false,
      isFeatured: true,
      preparationTime: 20,
    },
    {
      category: 'Main Course',
      name: 'Wild Mushroom Risotto',
      description: 'Slow-cooked Arborio rice with porcini mushrooms, butter, white wine, and aged parmesan.',
      price: 369.0,
      image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isFeatured: false,
      preparationTime: 22,
    },

  ];

  let productCount = 0;
  for (const prod of productsData) {
    const categoryId = categoryMap.get(prod.category);
    if (categoryId) {
      const existingProduct = await prisma.product.findFirst({
        where: { cafeId: cafe.id, name: prod.name },
      });

      if (!existingProduct) {
        await prisma.product.create({
          data: {
            cafeId: cafe.id,
            categoryId,
            name: prod.name,
            description: prod.description,
            price: prod.price,
            image: prod.image,
            isVeg: prod.isVeg,
            isFeatured: prod.isFeatured,
            preparationTime: prod.preparationTime,
            isAvailable: true,
          },
        });
        productCount++;
      } else {
        // Product already exists: Preserve existing user image if present!
        // Only set seed image if the product currently has no image in DB
        if (!existingProduct.image && prod.image) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: { image: prod.image },
          });
        }
        productCount++;
      }
    }
  }

  console.log(`✅ Products verified (${productCount} active menu items)`);
  console.log('\n✨ Database seeding completed successfully!');
  console.log(`📌 Table 01 QR URL token preview: ${tables[0].qrToken}`);
  console.log('📌 Customer URL sample: http://localhost:5173/menu?table=' + tables[0].qrToken);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
