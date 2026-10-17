import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard, type ThrottlerLimitDetail } from "@nestjs/throttler";

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const apiKey = req.apiKey as { id: number } | undefined;
    return apiKey ? `api-key:${apiKey.id}` : (req.ip as string);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);
    res.header("Retry-After", Math.max(1, throttlerLimitDetail.timeToBlockExpire));
    return super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
