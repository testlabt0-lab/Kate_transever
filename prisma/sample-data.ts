import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding sample data...');

  // إضافة مزارعين
  const farmers = [
    { name: 'أحمد', fullName: 'أحمد محمد علي', phone: '777123456', balance: 0 },
    { name: 'محمد', fullName: 'محمد سالم أحمد', phone: '777654321', balance: 0 },
    { name: 'علي', fullName: 'علي حسن محمد', phone: '777987654', balance: 0 },
  ];

  for (const farmer of farmers) {
    const existing = await prisma.farmer.findFirst({
      where: { name: farmer.name },
    });
    if (!existing) {
      await prisma.farmer.create({ data: farmer });
      console.log(`✅ Created farmer: ${farmer.name}`);
    }
  }

  // إضافة وكلاء
  const agents = [
    { name: 'وكيل الرياض', phone: '777111111', balance: 0 },
    { name: 'وكيل جدة', phone: '777222222', balance: 0 },
    { name: 'وكيل مكة', phone: '777333333', balance: 0 },
  ];

  for (const agent of agents) {
    const existing = await prisma.agent.findFirst({
      where: { name: agent.name },
    });
    if (!existing) {
      await prisma.agent.create({ data: agent });
      console.log(`✅ Created agent: ${agent.name}`);
    }
  }

  // إضافة ناقلين
  const transporters = [
    { name: 'أبو سالم', phone: '777444444' },
    { name: 'أبو أحمد', phone: '777555555' },
    { name: 'أبو محمد', phone: '777666666' },
  ];

  for (const transporter of transporters) {
    const existing = await prisma.transporter.findFirst({
      where: { name: transporter.name },
    });
    if (!existing) {
      await prisma.transporter.create({ data: transporter });
      console.log(`✅ Created transporter: ${transporter.name}`);
    }
  }

  // إضافة مستخدم عامل
  const existingWorker = await prisma.user.findUnique({
    where: { username: 'worker' },
  });

  if (!existingWorker) {
    const hashedPassword = await bcrypt.hash('worker123', 10);
    await prisma.user.create({
      data: {
        username: 'worker',
        password: hashedPassword,
        role: 'WORKER',
      },
    });
    console.log('✅ Created worker user (username: worker, password: worker123)');
  }

  console.log('🎉 Sample data completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
