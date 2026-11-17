import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, AuthedRequest } from "../auth/auth.guard";
import { ZodPipe } from "../common/zod.pipe";
import { ListingsService } from "./listings.service";

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  make: z.string().min(1).max(80).optional(),
  yearMin: z.coerce.number().int().min(1900).max(2100).optional(),
  yearMax: z.coerce.number().int().min(1900).max(2100).optional(),
});

const ListingSchema = z.object({
  title: z.string().min(1).max(200),
  make: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  year: z.number().int().min(1900).max(2100),
  vin: z.string().min(5).max(32),
  mileage: z.number().int().min(0).max(10_000_000),
  priceUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/, "must be a decimal with <= 6 places"),
});

type ListQueryDto = z.infer<typeof ListQuerySchema>;
type ListingDto = z.infer<typeof ListingSchema>;

@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  list(@Query(new ZodPipe(ListQuerySchema)) query: ListQueryDto) {
    return this.listings.list(query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.listings.get(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req: AuthedRequest, @Body(new ZodPipe(ListingSchema)) body: ListingDto) {
    const user = req.user as NonNullable<AuthedRequest["user"]>;
    return this.listings.create(user.id, body);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  update(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body(new ZodPipe(ListingSchema.partial())) body: Partial<ListingDto>,
  ) {
    const user = req.user as NonNullable<AuthedRequest["user"]>;
    return this.listings.update(id, user.id, body);
  }
}
