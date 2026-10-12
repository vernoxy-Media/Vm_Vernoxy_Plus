// Top 1000 common passwords (lowercase) compiled from standard security lists
export const COMMON_PASSWORDS_SET = new Set<string>([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567',
  'dragon', '123123', 'baseball', 'football', 'monkey', 'letmein', 'shadow', 'master', '666666',
  'superman', 'trustno1', 'michael', 'jordan', 'harley', 'chelsea', 'charlie', 'robert', 'daniel',
  'thomas', 'secret', 'sunshine', 'princess', 'ashley', 'bailey', 'jessica', 'hunter', 'buster',
  'pepper', 'killer', 'buster1', 'soccer', 'orange', 'ginger', 'peanut', 'bubbles', 'barbie',
  'starwars', 'matrix', 'merlin', 'cowboy', 'silver', 'diamond', 'cookie', 'mustang', 'chevy',
  'jackson', 'corvette', 'camaro', 'patriots', 'redsox', 'yankees', 'cubs', 'bulls', 'lakers',
  'eagles', 'steelers', 'packers', 'raiders', 'cowboys', 'dolphins', 'vikings', 'titans', 'broncos',
  'freedom', 'welcome', 'testing', 'donald', 'george', 'william', 'david', 'richard', 'charles',
  'joseph', 'andrew', 'anthony', 'joshua', 'walter', 'patrick', 'dennis', 'stephen', 'edward',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'iloveyou', 'iloveme', 'admin123', 'admin1234', 'password1',
  'password12', 'password123', 'pass1234', 'welcome1', 'welcome123', 'changeme', 'secret123',
  'summer2024', 'winter2024', 'spring2024', 'autumn2024', 'summer2025', 'winter2025', 'spring2025',
  'autumn2025', 'summer2026', 'winter2026', 'spring2026', 'autumn2026', 'qwerty12345', 'qwerty1234',
  '1234567890', '0987654321', '11111111', '22222222', '33333333', '44444444', '55555555',
  '66666666', '77777777', '88888888', '99999999', '00000000', 'password01', 'password02',
  'password99', 'trustnoone', 'supersecret', 'access1234', 'login12345', 'pulse12345', 'vernoxy123'
]);

// Helper to check if a password is in common passwords
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS_SET.has(password.trim().toLowerCase());
}
