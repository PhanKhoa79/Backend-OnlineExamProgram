export class AccountDto {
  id: number;
  accountname: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  isActive: boolean;
  urlAvatar: string | null;
}
