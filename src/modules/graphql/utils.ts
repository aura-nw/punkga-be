export function errorOrEmpty(result: any, fieldName: string) {
  if (result.errors && result.errors.length > 0) {
    return true;
  }

  if (result.data[fieldName].length === 0) {
    return true;
  }

  return false;
}
