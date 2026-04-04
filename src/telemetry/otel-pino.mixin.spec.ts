import { otelMixin } from './otel-pino.mixin';

jest.mock('@opentelemetry/api', () => ({
  trace: { getActiveSpan: jest.fn() },
  isSpanContextValid: jest.fn(),
}));

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: { getClsService: jest.fn() },
}));

import * as otelApi from '@opentelemetry/api';
import { ClsServiceManager } from 'nestjs-cls';

const mockGetActiveSpan = otelApi.trace.getActiveSpan as jest.Mock;
const mockIsSpanContextValid = otelApi.isSpanContextValid as jest.Mock;
const mockGetClsService = ClsServiceManager.getClsService as jest.Mock;

describe('otelMixin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no active OTEL span', () => {
    it('returns only userId anonymous', () => {
      mockGetActiveSpan.mockReturnValue(undefined);
      mockGetClsService.mockReturnValue(null);

      expect(otelMixin()).toEqual({ userId: 'anonymous' });
    });
  });

  describe('when active span has invalid context', () => {
    it('returns only userId anonymous', () => {
      mockGetActiveSpan.mockReturnValue({ spanContext: () => ({}) });
      mockIsSpanContextValid.mockReturnValue(false);
      mockGetClsService.mockReturnValue(null);

      expect(otelMixin()).toEqual({ userId: 'anonymous' });
    });
  });

  describe('when active span is valid', () => {
    it('returns traceId, spanId, traceFlags, and userId anonymous', () => {
      mockGetActiveSpan.mockReturnValue({
        spanContext: () => ({
          traceId: 'aabbccdd11223344aabbccdd11223344',
          spanId: 'aabbccdd11223344',
          traceFlags: 1,
        }),
      });
      mockIsSpanContextValid.mockReturnValue(true);
      mockGetClsService.mockReturnValue(null);

      expect(otelMixin()).toEqual({
        traceId: 'aabbccdd11223344aabbccdd11223344',
        spanId: 'aabbccdd11223344',
        traceFlags: 1,
        userId: 'anonymous',
      });
    });
  });

  describe('when CLS store has a userId', () => {
    it('returns the stored userId', () => {
      mockGetActiveSpan.mockReturnValue(undefined);
      mockGetClsService.mockReturnValue({ get: jest.fn().mockReturnValue('user_42') });

      expect(otelMixin()).toEqual({ userId: 'user_42' });
    });
  });

  describe('when CLS store get returns undefined', () => {
    it('falls back to anonymous', () => {
      mockGetActiveSpan.mockReturnValue(undefined);
      mockGetClsService.mockReturnValue({ get: jest.fn().mockReturnValue(undefined) });

      expect(otelMixin()).toEqual({ userId: 'anonymous' });
    });
  });
});
