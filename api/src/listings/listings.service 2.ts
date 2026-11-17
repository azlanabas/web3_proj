import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface ListQuery {
  page: number;
  limit: number;
  make?: string;
  yearMin?: number;
  yearMax?: number;
}

export interface ListingInput {
  title: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  priceUsdc: string;
}

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery) {
    const where: Prisma.ListingWhereInput = { status: "LISTED", deletedAt: null };
    if (query.make) where.make = { equals: query.make, mode: "insensitive" };
    if (query.yearMin !== undefined || query.yearMax !== undefined) {
      where.year = { gte: query.yearMin ?? 1900, lte: query.yearMax ?? 2100 };
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.limit,
        include: { images: true },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async get(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
      include: { images: true },
    });
    if (!listing) throw new NotFoundException("listing not found");
    return listing;
  }

  async create(sellerId: string, input: ListingInput) {
    return this.prisma.listing.create({
      data: { ...input, sellerId, status: "LISTED" },
      include: { images: true },
    });
  }

  async update(id: string, sellerId: string, input: Partial<ListingInput>) {
    const existing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException("listing not found");
    if (existing.sellerId !== sellerId) throw new ForbiddenException("not your listing");

    return this.prisma.listing.update({ where: { id }, data: input });
  }
}
