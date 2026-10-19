export interface ApproverResolverPort {
  getAdminApproverIds(): Promise<number[]>;
}
