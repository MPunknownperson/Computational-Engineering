/**
 * Private backend endpoints (shell, archive/tool installation, raw logs) are
 * disabled: the operator key has been removed, so access always fails closed.
 */
export function hasAdminKey(_request: Request): boolean {
  void _request;
  return false;
}
