export class StudentDto {
  id: number;
  studentCode: string;
  fullName: string;
  email: string | null;
  address?: string | null;
  dateOfBirth?: string;
  phoneNumber?: string | null;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  classId: number;
  accountId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}
