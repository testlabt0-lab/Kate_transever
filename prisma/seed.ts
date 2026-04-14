import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // إنشاء المستخدم الافتراضي
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    console.log('✅ Created admin user: admin / admin123');
  } else {
    console.log('✅ Admin user already exists');
  }

  // إنشاء أنواع القات مع أجرة التوصيل
  const khatTypesData = [
    { name: 'قات عادي', feePerPiece: 10 },
    { name: 'قات ممتاز', feePerPiece: 8 },
    { name: 'قات سوبر', feePerPiece: 12 },
    { name: 'قات حضرمي', feePerPiece: 15 },
  ];

  for (const khatType of khatTypesData) {
    const existing = await prisma.khatType.findUnique({
      where: { name: khatType.name },
    });

    if (!existing) {
      await prisma.khatType.create({ data: khatType });
      console.log(`✅ Created: ${khatType.name} - الأجرة: ${khatType.feePerPiece} ريال/حبة`);
    }
  }

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
