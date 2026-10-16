const COMMON = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  'qwerty', 'qwerty123', '111111', '000000', 'abc123', 'letmein', 'welcome',
  'admin', 'iloveyou', 'monkey', 'dragon', 'almuqri', 'almuqri123',
]);

export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (COMMON.has(password.toLowerCase())) {
    return 'That password is too common. Choose a different one.';
  }
  return null;
}
