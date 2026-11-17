import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/** Global rate limit; auth routes add a tighter @Throttle on top. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {}
