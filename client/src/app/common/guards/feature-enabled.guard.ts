import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';

import { FeatureId, FeatureService } from '../services/feature.service';

/**
 * Matches a route only while `feature` is on (angular.md → Guards: FeatureGuard). Put a fallback
 * route with the same path after it, so a disabled feature shows the fallback instead of nothing,
 * mirroring the API's 404 for an unreleased feature.
 */
export function featureEnabled(feature: FeatureId): CanMatchFn {
  return () => inject(FeatureService).isEnabled(feature);
}
