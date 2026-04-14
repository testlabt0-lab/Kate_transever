import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (user) {
    console.log('User found:', {
      id: user.id,
      username: user.username,
      role: user.role,
      passwordHash: user.password.substring(0, 30) + '...',
    });

    // Test password comparison
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log('Password "admin123" valid:', isValid);

    // Try creating a new hash and compare
    const newHash = await bcrypt.hash('admin123', 10);
    console.log('New hash:', newHash.substring(0, 30) + '...');

    const isNewValid = await bcrypt.compare('admin123', newHash);
    console.log('New hash valid:', isNewValid);
  } else {
    console.log('User not found!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
