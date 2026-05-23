export type UserInfo = {
  username: string;
  status: string;
  expiryDate?: string;
  activeConnections: number;
  maxConnections: number;
};

export interface AccountService {
  validateCredentials(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<UserInfo>;

  getAccountInfo(): Promise<UserInfo>;
}
