import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEMO_BUYER = "0x00000000000000000000000000000000000000bb";
const DEMO_SELLER = "0x00000000000000000000000000000000000000aa";

const SEED_LISTINGS = [
  { title: "2019 Toyota Hilux", make: "Toyota", model: "Hilux", year: 2019, vin: "MROHR1234567890", mileage: 64000, priceUsdc: "18500.000000" },
  { title: "2021 Honda PCX 160", make: "Honda", model: "PCX 160", year: 2021, vin: "MH1KF1234567890", mileage: 12400, priceUsdc: "3200.000000" },
  { title: "2017 Mitsubishi Pajero", make: "Mitsubishi", model: "Pajero Sport", year: 2017, vin: "MMBJNKB1234567", mileage: 98000, priceUsdc: "21750.000000" },
];

@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureData(): Promise<void> {
    const seller = await this.prisma.user.upsert({
      where: { walletAddress: DEMO_SELLER },
      create: { walletAddress: DEMO_SELLER, role: "SELLER" },
      update: {},
    });

    const existing = await this.prisma.listing.count({ where: { sellerId: seller.id } });
    if (existing === 0) {
      for (const item of SEED_LISTINGS) {
        await this.prisma.listing.create({
          data: { ...item, sellerId: seller.id, status: "LISTED" },
        });
      }
    }
  }

  async session(): Promise<{ id: string; walletAddress: string }> {
    await this.ensureData();
    const buyer = await this.prisma.user.upsert({
      where: { walletAddress: DEMO_BUYER },
      create: { walletAddress: DEMO_BUYER, role: "BUYER" },
      update: {},
    });
    return { id: buyer.id, walletAddress: buyer.walletAddress };
  }

  async reset(): Promise<{ ok: boolean }> {
    await this.prisma.chainEvent.deleteMany({});
    await this.prisma.escrow.deleteMany({});
    return { ok: true };
  }
}
