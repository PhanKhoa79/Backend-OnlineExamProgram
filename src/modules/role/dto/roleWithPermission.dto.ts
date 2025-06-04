export class RoleWithPermissionsDto {
  id: number;
  name: string;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
