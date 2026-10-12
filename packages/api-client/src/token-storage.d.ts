type AuthEvent = {
    type: 'LOGOUT';
} | {
    type: 'LOGIN';
    token: string;
};
export declare function getAccessToken(): string | null;
export declare function setAccessToken(token: string | null): void;
export declare function broadcastLogout(): void;
export declare function subscribeAuthEvents(callback: (event: AuthEvent) => void): () => void;
export {};
