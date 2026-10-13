export interface UserAuthorizationPort {
  isUserAuthorizedToManage(empId: number, entityType: string): Promise<boolean>;
}
