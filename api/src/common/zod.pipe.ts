import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodError, ZodType } from "zod";

/** Validates a request body against a Zod schema; 400 with field detail on failure. */
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        const detail = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new BadRequestException(`Validation failed: ${detail}`);
      }
      throw err;
    }
  }
}
