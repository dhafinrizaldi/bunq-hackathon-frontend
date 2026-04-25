interface User {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  bankName: string;
}

export const mockUser: User = {
  id: 'user-1',
  name: 'Meghan',
  avatarUrl: 'https://i.pravatar.cc/150?u=user-1',
  email: 'meghan@example.com',
  bankName: 'bunq',
};
