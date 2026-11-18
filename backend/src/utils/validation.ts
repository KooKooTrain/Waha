export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateCoordinates(lat: unknown, lng: unknown): string[] {
  const errors: string[] = [];
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    errors.push('Latitude must be a valid number between -90 and 90.');
  }
  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
    errors.push('Longitude must be a valid number between -180 and 180.');
  }
  return errors;
}

export function validateBuildingInput(body: any): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Request body must be a JSON object.'] };
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    errors.push('Building name is required.');
  }

  errors.push(...validateCoordinates(body.latitude, body.longitude));

  if (typeof body.acUnits !== 'number' || isNaN(body.acUnits) || body.acUnits <= 0) {
    errors.push('AC units must be a positive number.');
  }

  if (
    typeof body.averageOperatingHours !== 'number' ||
    isNaN(body.averageOperatingHours) ||
    body.averageOperatingHours <= 0 ||
    body.averageOperatingHours > 24
  ) {
    errors.push('Average operating hours must be a number between 0 and 24.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateRainfallInput(body: any): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Request body must be a JSON object.'] };
  }

  errors.push(...validateCoordinates(body.latitude, body.longitude));

  if (typeof body.rainfallMm !== 'number' || isNaN(body.rainfallMm) || body.rainfallMm < 0) {
    errors.push('Rainfall (mm) must be a non-negative number.');
  }

  if (typeof body.catchmentAreaM2 !== 'number' || isNaN(body.catchmentAreaM2) || body.catchmentAreaM2 <= 0) {
    errors.push('Catchment area (m²) must be a positive number.');
  }

  if (
    typeof body.runoffCoefficient !== 'number' ||
    isNaN(body.runoffCoefficient) ||
    body.runoffCoefficient <= 0 ||
    body.runoffCoefficient > 1.0
  ) {
    errors.push('Runoff coefficient must be a number between 0.0 and 1.0.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCommunityInput(body: any): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Request body must be a JSON object.'] };
  }

  errors.push(...validateCoordinates(body.latitude, body.longitude));

  if (!body.type || typeof body.type !== 'string' || body.type.trim() === '') {
    errors.push('Observation type is required.');
  }

  if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
    errors.push('Description is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
