export class StudentDto {
  id: number;
  studentCode: string;
  fullName: string;
  email: string | null;
  address?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
}
