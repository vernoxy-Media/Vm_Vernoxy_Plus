import type { DataTag, DefinedInitialDataOptions, DefinedUseQueryResult, QueryClient, QueryKey, UndefinedInitialDataOptions, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { CompanyDataTransferControllerPreviewBody, CompanyDetailResponseDto, CompanyDuplicateMatchDto, CompanyImportConfirmResponseDto, CompanyImportPreviewResponseDto, CompanyOptionDto, CreateCompanyDto, CreateCustomerTypeDto, CreateDepartmentDto, CreateEmployeeDto, CreateIndustryDto, CreateRoleDto, CustomerTypeItemDto, CustomerTypeOptionDto, DataTransferJobDetailResponseDto, DepartmentListResponseDto, DepartmentOptionDto, DepartmentResponseDto, EmployeeControllerGetOptionsParams, EmployeeControllerUploadPhotoBody, EmployeeListResponseDto, EmployeeOptionDto, EmployeeResponseDto, FilesControllerGetProfilePhotoParams, ForgotPasswordResponseDto, IndustryDetailResponseDto, IndustryOptionDto, ListCompaniesResponseDto, ListCustomerTypesResponseDto, ListIndustriesResponseDto, LoginResponseDto, LookupOptionDto, MeResponseDto, PersonLookupMatchDto, RefreshResponseDto, RoleControllerGetOptionsParams, RoleListResponseDto, RoleOptionDto, RoleResponseDto, TransferJobIssuesResponseDto, TransferJobListResponseDto, UpdateCompanyDto, UpdateCustomerTypeDto, UpdateDepartmentDto, UpdateEmployeeDto, UpdateIndustryDto, UpdateRoleDto, VerifyLoginResponseDto } from './model';
import { customFetch } from '../custom-fetch';
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Liveness & readiness probe (including database connection)
 */
export type healthControllerGetHealthResponse200 = {
    data: unknown;
    status: 200;
};
export type healthControllerGetHealthResponse503 = {
    data: void;
    status: 503;
};
export type healthControllerGetHealthResponseSuccess = (healthControllerGetHealthResponse200) & {
    headers: Headers;
};
export type healthControllerGetHealthResponseError = (healthControllerGetHealthResponse503) & {
    headers: Headers;
};
export type healthControllerGetHealthResponse = (healthControllerGetHealthResponseSuccess | healthControllerGetHealthResponseError);
export declare const getHealthControllerGetHealthUrl: () => string;
export declare const healthControllerGetHealth: (options?: RequestInit) => Promise<healthControllerGetHealthResponse>;
export declare const getHealthControllerGetHealthQueryKey: () => readonly ["/api/v1/health"];
export declare const getHealthControllerGetHealthQueryOptions: <TData = Awaited<ReturnType<typeof healthControllerGetHealth>>, TError = void>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof healthControllerGetHealth>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthControllerGetHealth>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type HealthControllerGetHealthQueryResult = NonNullable<Awaited<ReturnType<typeof healthControllerGetHealth>>>;
export type HealthControllerGetHealthQueryError = void;
export declare function useHealthControllerGetHealth<TData = Awaited<ReturnType<typeof healthControllerGetHealth>>, TError = void>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof healthControllerGetHealth>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof healthControllerGetHealth>>, TError, Awaited<ReturnType<typeof healthControllerGetHealth>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useHealthControllerGetHealth<TData = Awaited<ReturnType<typeof healthControllerGetHealth>>, TError = void>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof healthControllerGetHealth>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof healthControllerGetHealth>>, TError, Awaited<ReturnType<typeof healthControllerGetHealth>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useHealthControllerGetHealth<TData = Awaited<ReturnType<typeof healthControllerGetHealth>>, TError = void>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof healthControllerGetHealth>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Initiate login with email and password (sends 2FA email OTP)
 */
export type authControllerLoginResponse200 = {
    data: LoginResponseDto;
    status: 200;
};
export type authControllerLoginResponse401 = {
    data: void;
    status: 401;
};
export type authControllerLoginResponseSuccess = (authControllerLoginResponse200) & {
    headers: Headers;
};
export type authControllerLoginResponseError = (authControllerLoginResponse401) & {
    headers: Headers;
};
export type authControllerLoginResponse = (authControllerLoginResponseSuccess | authControllerLoginResponseError);
export declare const getAuthControllerLoginUrl: () => string;
export declare const authControllerLogin: (options?: RequestInit) => Promise<authControllerLoginResponse>;
export declare const getAuthControllerLoginMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerLogin>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerLogin>>, TError, void, TContext>;
export type AuthControllerLoginMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerLogin>>>;
export type AuthControllerLoginMutationError = void;
/**
* @summary Initiate login with email and password (sends 2FA email OTP)
*/
export declare const useAuthControllerLogin: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerLogin>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerLogin>>, TError, void, TContext>;
/**
 * @summary Verify email OTP and establish session
 */
export type authControllerVerifyLoginResponse200 = {
    data: VerifyLoginResponseDto;
    status: 200;
};
export type authControllerVerifyLoginResponse401 = {
    data: void;
    status: 401;
};
export type authControllerVerifyLoginResponseSuccess = (authControllerVerifyLoginResponse200) & {
    headers: Headers;
};
export type authControllerVerifyLoginResponseError = (authControllerVerifyLoginResponse401) & {
    headers: Headers;
};
export type authControllerVerifyLoginResponse = (authControllerVerifyLoginResponseSuccess | authControllerVerifyLoginResponseError);
export declare const getAuthControllerVerifyLoginUrl: () => string;
export declare const authControllerVerifyLogin: (options?: RequestInit) => Promise<authControllerVerifyLoginResponse>;
export declare const getAuthControllerVerifyLoginMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerVerifyLogin>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerVerifyLogin>>, TError, void, TContext>;
export type AuthControllerVerifyLoginMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerVerifyLogin>>>;
export type AuthControllerVerifyLoginMutationError = void;
/**
* @summary Verify email OTP and establish session
*/
export declare const useAuthControllerVerifyLogin: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerVerifyLogin>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerVerifyLogin>>, TError, void, TContext>;
/**
 * @summary Resend email OTP for open challenge adhering to cooldown
 */
export type authControllerResendOtpResponse200 = {
    data: LoginResponseDto;
    status: 200;
};
export type authControllerResendOtpResponse429 = {
    data: void;
    status: 429;
};
export type authControllerResendOtpResponseSuccess = (authControllerResendOtpResponse200) & {
    headers: Headers;
};
export type authControllerResendOtpResponseError = (authControllerResendOtpResponse429) & {
    headers: Headers;
};
export type authControllerResendOtpResponse = (authControllerResendOtpResponseSuccess | authControllerResendOtpResponseError);
export declare const getAuthControllerResendOtpUrl: () => string;
export declare const authControllerResendOtp: (options?: RequestInit) => Promise<authControllerResendOtpResponse>;
export declare const getAuthControllerResendOtpMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerResendOtp>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerResendOtp>>, TError, void, TContext>;
export type AuthControllerResendOtpMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerResendOtp>>>;
export type AuthControllerResendOtpMutationError = void;
/**
* @summary Resend email OTP for open challenge adhering to cooldown
*/
export declare const useAuthControllerResendOtp: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerResendOtp>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerResendOtp>>, TError, void, TContext>;
/**
 * @summary Rotate refresh token and issue new access token
 */
export type authControllerRefreshResponse200 = {
    data: RefreshResponseDto;
    status: 200;
};
export type authControllerRefreshResponse401 = {
    data: void;
    status: 401;
};
export type authControllerRefreshResponseSuccess = (authControllerRefreshResponse200) & {
    headers: Headers;
};
export type authControllerRefreshResponseError = (authControllerRefreshResponse401) & {
    headers: Headers;
};
export type authControllerRefreshResponse = (authControllerRefreshResponseSuccess | authControllerRefreshResponseError);
export declare const getAuthControllerRefreshUrl: () => string;
export declare const authControllerRefresh: (options?: RequestInit) => Promise<authControllerRefreshResponse>;
export declare const getAuthControllerRefreshMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerRefresh>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerRefresh>>, TError, void, TContext>;
export type AuthControllerRefreshMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerRefresh>>>;
export type AuthControllerRefreshMutationError = void;
/**
* @summary Rotate refresh token and issue new access token
*/
export declare const useAuthControllerRefresh: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerRefresh>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerRefresh>>, TError, void, TContext>;
/**
 * @summary Revoke current session and clear refresh cookie
 */
export type authControllerLogoutResponse204 = {
    data: void;
    status: 204;
};
export type authControllerLogoutResponseSuccess = (authControllerLogoutResponse204) & {
    headers: Headers;
};
export type authControllerLogoutResponse = (authControllerLogoutResponseSuccess);
export declare const getAuthControllerLogoutUrl: () => string;
export declare const authControllerLogout: (options?: RequestInit) => Promise<authControllerLogoutResponse>;
export declare const getAuthControllerLogoutMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerLogout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerLogout>>, TError, void, TContext>;
export type AuthControllerLogoutMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerLogout>>>;
export type AuthControllerLogoutMutationError = unknown;
/**
* @summary Revoke current session and clear refresh cookie
*/
export declare const useAuthControllerLogout: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerLogout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerLogout>>, TError, void, TContext>;
/**
 * @summary Revoke all sessions for current employee
 */
export type authControllerLogoutAllResponse204 = {
    data: void;
    status: 204;
};
export type authControllerLogoutAllResponseSuccess = (authControllerLogoutAllResponse204) & {
    headers: Headers;
};
export type authControllerLogoutAllResponse = (authControllerLogoutAllResponseSuccess);
export declare const getAuthControllerLogoutAllUrl: () => string;
export declare const authControllerLogoutAll: (options?: RequestInit) => Promise<authControllerLogoutAllResponse>;
export declare const getAuthControllerLogoutAllMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerLogoutAll>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerLogoutAll>>, TError, void, TContext>;
export type AuthControllerLogoutAllMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerLogoutAll>>>;
export type AuthControllerLogoutAllMutationError = unknown;
/**
* @summary Revoke all sessions for current employee
*/
export declare const useAuthControllerLogoutAll: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerLogoutAll>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerLogoutAll>>, TError, void, TContext>;
/**
 * @summary Get profile information of authenticated user
 */
export type authControllerGetMeResponse200 = {
    data: MeResponseDto;
    status: 200;
};
export type authControllerGetMeResponseSuccess = (authControllerGetMeResponse200) & {
    headers: Headers;
};
export type authControllerGetMeResponse = (authControllerGetMeResponseSuccess);
export declare const getAuthControllerGetMeUrl: () => string;
export declare const authControllerGetMe: (options?: RequestInit) => Promise<authControllerGetMeResponse>;
export declare const getAuthControllerGetMeQueryKey: () => readonly ["/api/v1/auth/me"];
export declare const getAuthControllerGetMeQueryOptions: <TData = Awaited<ReturnType<typeof authControllerGetMe>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof authControllerGetMe>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof authControllerGetMe>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AuthControllerGetMeQueryResult = NonNullable<Awaited<ReturnType<typeof authControllerGetMe>>>;
export type AuthControllerGetMeQueryError = unknown;
export declare function useAuthControllerGetMe<TData = Awaited<ReturnType<typeof authControllerGetMe>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof authControllerGetMe>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof authControllerGetMe>>, TError, Awaited<ReturnType<typeof authControllerGetMe>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAuthControllerGetMe<TData = Awaited<ReturnType<typeof authControllerGetMe>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof authControllerGetMe>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof authControllerGetMe>>, TError, Awaited<ReturnType<typeof authControllerGetMe>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAuthControllerGetMe<TData = Awaited<ReturnType<typeof authControllerGetMe>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof authControllerGetMe>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Change password and revoke all other sessions
 */
export type authControllerChangePasswordResponse204 = {
    data: void;
    status: 204;
};
export type authControllerChangePasswordResponseSuccess = (authControllerChangePasswordResponse204) & {
    headers: Headers;
};
export type authControllerChangePasswordResponse = (authControllerChangePasswordResponseSuccess);
export declare const getAuthControllerChangePasswordUrl: () => string;
export declare const authControllerChangePassword: (options?: RequestInit) => Promise<authControllerChangePasswordResponse>;
export declare const getAuthControllerChangePasswordMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerChangePassword>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerChangePassword>>, TError, void, TContext>;
export type AuthControllerChangePasswordMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerChangePassword>>>;
export type AuthControllerChangePasswordMutationError = unknown;
/**
* @summary Change password and revoke all other sessions
*/
export declare const useAuthControllerChangePassword: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerChangePassword>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerChangePassword>>, TError, void, TContext>;
/**
 * @summary Request password reset code (always returns 202)
 */
export type authControllerForgotPasswordResponse202 = {
    data: ForgotPasswordResponseDto;
    status: 202;
};
export type authControllerForgotPasswordResponseSuccess = (authControllerForgotPasswordResponse202) & {
    headers: Headers;
};
export type authControllerForgotPasswordResponse = (authControllerForgotPasswordResponseSuccess);
export declare const getAuthControllerForgotPasswordUrl: () => string;
export declare const authControllerForgotPassword: (options?: RequestInit) => Promise<authControllerForgotPasswordResponse>;
export declare const getAuthControllerForgotPasswordMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerForgotPassword>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerForgotPassword>>, TError, void, TContext>;
export type AuthControllerForgotPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerForgotPassword>>>;
export type AuthControllerForgotPasswordMutationError = unknown;
/**
* @summary Request password reset code (always returns 202)
*/
export declare const useAuthControllerForgotPassword: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerForgotPassword>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerForgotPassword>>, TError, void, TContext>;
/**
 * @summary Reset password using email OTP and revoke all sessions
 */
export type authControllerResetPasswordResponse204 = {
    data: void;
    status: 204;
};
export type authControllerResetPasswordResponse400 = {
    data: void;
    status: 400;
};
export type authControllerResetPasswordResponseSuccess = (authControllerResetPasswordResponse204) & {
    headers: Headers;
};
export type authControllerResetPasswordResponseError = (authControllerResetPasswordResponse400) & {
    headers: Headers;
};
export type authControllerResetPasswordResponse = (authControllerResetPasswordResponseSuccess | authControllerResetPasswordResponseError);
export declare const getAuthControllerResetPasswordUrl: () => string;
export declare const authControllerResetPassword: (options?: RequestInit) => Promise<authControllerResetPasswordResponse>;
export declare const getAuthControllerResetPasswordMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerResetPassword>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerResetPassword>>, TError, void, TContext>;
export type AuthControllerResetPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerResetPassword>>>;
export type AuthControllerResetPasswordMutationError = void;
/**
* @summary Reset password using email OTP and revoke all sessions
*/
export declare const useAuthControllerResetPassword: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerResetPassword>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerResetPassword>>, TError, void, TContext>;
/**
 * @summary JSON Web Key Set (public keys for verifying pulse tokens)
 */
export type jwksControllerGetJwksResponse200 = {
    data: void;
    status: 200;
};
export type jwksControllerGetJwksResponseSuccess = (jwksControllerGetJwksResponse200) & {
    headers: Headers;
};
export type jwksControllerGetJwksResponse = (jwksControllerGetJwksResponseSuccess);
export declare const getJwksControllerGetJwksUrl: () => string;
export declare const jwksControllerGetJwks: (options?: RequestInit) => Promise<jwksControllerGetJwksResponse>;
export declare const getJwksControllerGetJwksQueryKey: () => readonly ["/.well-known/jwks.json"];
export declare const getJwksControllerGetJwksQueryOptions: <TData = Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type JwksControllerGetJwksQueryResult = NonNullable<Awaited<ReturnType<typeof jwksControllerGetJwks>>>;
export type JwksControllerGetJwksQueryError = unknown;
export declare function useJwksControllerGetJwks<TData = Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError, Awaited<ReturnType<typeof jwksControllerGetJwks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useJwksControllerGetJwks<TData = Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError, Awaited<ReturnType<typeof jwksControllerGetJwks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useJwksControllerGetJwks<TData = Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof jwksControllerGetJwks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Public signed profile photo retrieval
 */
export type filesControllerGetProfilePhotoResponse200 = {
    data: void;
    status: 200;
};
export type filesControllerGetProfilePhotoResponse403 = {
    data: void;
    status: 403;
};
export type filesControllerGetProfilePhotoResponseSuccess = (filesControllerGetProfilePhotoResponse200) & {
    headers: Headers;
};
export type filesControllerGetProfilePhotoResponseError = (filesControllerGetProfilePhotoResponse403) & {
    headers: Headers;
};
export type filesControllerGetProfilePhotoResponse = (filesControllerGetProfilePhotoResponseSuccess | filesControllerGetProfilePhotoResponseError);
export declare const getFilesControllerGetProfilePhotoUrl: (key: unknown, params: FilesControllerGetProfilePhotoParams) => string;
export declare const filesControllerGetProfilePhoto: (key: unknown, params: FilesControllerGetProfilePhotoParams, options?: RequestInit) => Promise<filesControllerGetProfilePhotoResponse>;
export declare const getFilesControllerGetProfilePhotoQueryKey: (key?: unknown, params?: FilesControllerGetProfilePhotoParams) => readonly [`/api/v1/files/profile-photos/${string}`, ...FilesControllerGetProfilePhotoParams[]];
export declare const getFilesControllerGetProfilePhotoQueryOptions: <TData = Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError = void>(key: unknown, params: FilesControllerGetProfilePhotoParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type FilesControllerGetProfilePhotoQueryResult = NonNullable<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>>;
export type FilesControllerGetProfilePhotoQueryError = void;
export declare function useFilesControllerGetProfilePhoto<TData = Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError = void>(key: unknown, params: FilesControllerGetProfilePhotoParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useFilesControllerGetProfilePhoto<TData = Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError = void>(key: unknown, params: FilesControllerGetProfilePhotoParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useFilesControllerGetProfilePhoto<TData = Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError = void>(key: unknown, params: FilesControllerGetProfilePhotoParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary List departments with keyset pagination
 */
export type departmentControllerListResponse200 = {
    data: DepartmentListResponseDto;
    status: 200;
};
export type departmentControllerListResponseSuccess = (departmentControllerListResponse200) & {
    headers: Headers;
};
export type departmentControllerListResponse = (departmentControllerListResponseSuccess);
export declare const getDepartmentControllerListUrl: () => string;
export declare const departmentControllerList: (options?: RequestInit) => Promise<departmentControllerListResponse>;
export declare const getDepartmentControllerListQueryKey: () => readonly ["/api/v1/departments"];
export declare const getDepartmentControllerListQueryOptions: <TData = Awaited<ReturnType<typeof departmentControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type DepartmentControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof departmentControllerList>>>;
export type DepartmentControllerListQueryError = unknown;
export declare function useDepartmentControllerList<TData = Awaited<ReturnType<typeof departmentControllerList>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, Awaited<ReturnType<typeof departmentControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useDepartmentControllerList<TData = Awaited<ReturnType<typeof departmentControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, Awaited<ReturnType<typeof departmentControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useDepartmentControllerList<TData = Awaited<ReturnType<typeof departmentControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create department
 */
export type departmentControllerCreateResponse201 = {
    data: DepartmentResponseDto;
    status: 201;
};
export type departmentControllerCreateResponseSuccess = (departmentControllerCreateResponse201) & {
    headers: Headers;
};
export type departmentControllerCreateResponse = (departmentControllerCreateResponseSuccess);
export declare const getDepartmentControllerCreateUrl: () => string;
export declare const departmentControllerCreate: (createDepartmentDto: CreateDepartmentDto, options?: RequestInit) => Promise<departmentControllerCreateResponse>;
export declare const getDepartmentControllerCreateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof departmentControllerCreate>>, TError, {
        data: CreateDepartmentDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof departmentControllerCreate>>, TError, {
    data: CreateDepartmentDto;
}, TContext>;
export type DepartmentControllerCreateMutationResult = NonNullable<Awaited<ReturnType<typeof departmentControllerCreate>>>;
export type DepartmentControllerCreateMutationBody = CreateDepartmentDto;
export type DepartmentControllerCreateMutationError = unknown;
/**
* @summary Create department
*/
export declare const useDepartmentControllerCreate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof departmentControllerCreate>>, TError, {
        data: CreateDepartmentDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof departmentControllerCreate>>, TError, {
    data: CreateDepartmentDto;
}, TContext>;
/**
 * @summary Get active departments for dropdown select
 */
export type departmentControllerGetOptionsResponse200 = {
    data: DepartmentOptionDto[];
    status: 200;
};
export type departmentControllerGetOptionsResponseSuccess = (departmentControllerGetOptionsResponse200) & {
    headers: Headers;
};
export type departmentControllerGetOptionsResponse = (departmentControllerGetOptionsResponseSuccess);
export declare const getDepartmentControllerGetOptionsUrl: () => string;
export declare const departmentControllerGetOptions: (options?: RequestInit) => Promise<departmentControllerGetOptionsResponse>;
export declare const getDepartmentControllerGetOptionsQueryKey: () => readonly ["/api/v1/departments/options"];
export declare const getDepartmentControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type DepartmentControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof departmentControllerGetOptions>>>;
export type DepartmentControllerGetOptionsQueryError = unknown;
export declare function useDepartmentControllerGetOptions<TData = Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError, Awaited<ReturnType<typeof departmentControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useDepartmentControllerGetOptions<TData = Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError, Awaited<ReturnType<typeof departmentControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useDepartmentControllerGetOptions<TData = Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get department details by ID
 */
export type departmentControllerGetByIdResponse200 = {
    data: DepartmentResponseDto;
    status: 200;
};
export type departmentControllerGetByIdResponseSuccess = (departmentControllerGetByIdResponse200) & {
    headers: Headers;
};
export type departmentControllerGetByIdResponse = (departmentControllerGetByIdResponseSuccess);
export declare const getDepartmentControllerGetByIdUrl: (id: number) => string;
export declare const departmentControllerGetById: (id: number, options?: RequestInit) => Promise<departmentControllerGetByIdResponse>;
export declare const getDepartmentControllerGetByIdQueryKey: (id?: number) => readonly ["/api/v1/departments/undefined" | `/api/v1/departments/${number}`];
export declare const getDepartmentControllerGetByIdQueryOptions: <TData = Awaited<ReturnType<typeof departmentControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetById>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type DepartmentControllerGetByIdQueryResult = NonNullable<Awaited<ReturnType<typeof departmentControllerGetById>>>;
export type DepartmentControllerGetByIdQueryError = unknown;
export declare function useDepartmentControllerGetById<TData = Awaited<ReturnType<typeof departmentControllerGetById>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetById>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof departmentControllerGetById>>, TError, Awaited<ReturnType<typeof departmentControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useDepartmentControllerGetById<TData = Awaited<ReturnType<typeof departmentControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetById>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof departmentControllerGetById>>, TError, Awaited<ReturnType<typeof departmentControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useDepartmentControllerGetById<TData = Awaited<ReturnType<typeof departmentControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update department
 */
export type departmentControllerUpdateResponse200 = {
    data: DepartmentResponseDto;
    status: 200;
};
export type departmentControllerUpdateResponseSuccess = (departmentControllerUpdateResponse200) & {
    headers: Headers;
};
export type departmentControllerUpdateResponse = (departmentControllerUpdateResponseSuccess);
export declare const getDepartmentControllerUpdateUrl: (id: number) => string;
export declare const departmentControllerUpdate: (id: number, updateDepartmentDto: UpdateDepartmentDto, options?: RequestInit) => Promise<departmentControllerUpdateResponse>;
export declare const getDepartmentControllerUpdateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof departmentControllerUpdate>>, TError, {
        id: number;
        data: UpdateDepartmentDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof departmentControllerUpdate>>, TError, {
    id: number;
    data: UpdateDepartmentDto;
}, TContext>;
export type DepartmentControllerUpdateMutationResult = NonNullable<Awaited<ReturnType<typeof departmentControllerUpdate>>>;
export type DepartmentControllerUpdateMutationBody = UpdateDepartmentDto;
export type DepartmentControllerUpdateMutationError = unknown;
/**
* @summary Update department
*/
export declare const useDepartmentControllerUpdate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof departmentControllerUpdate>>, TError, {
        id: number;
        data: UpdateDepartmentDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof departmentControllerUpdate>>, TError, {
    id: number;
    data: UpdateDepartmentDto;
}, TContext>;
/**
 * @summary Soft delete department
 */
export type departmentControllerDeleteResponse204 = {
    data: void;
    status: 204;
};
export type departmentControllerDeleteResponseSuccess = (departmentControllerDeleteResponse204) & {
    headers: Headers;
};
export type departmentControllerDeleteResponse = (departmentControllerDeleteResponseSuccess);
export declare const getDepartmentControllerDeleteUrl: (id: number) => string;
export declare const departmentControllerDelete: (id: number, options?: RequestInit) => Promise<departmentControllerDeleteResponse>;
export declare const getDepartmentControllerDeleteMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof departmentControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof departmentControllerDelete>>, TError, {
    id: number;
}, TContext>;
export type DepartmentControllerDeleteMutationResult = NonNullable<Awaited<ReturnType<typeof departmentControllerDelete>>>;
export type DepartmentControllerDeleteMutationError = unknown;
/**
* @summary Soft delete department
*/
export declare const useDepartmentControllerDelete: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof departmentControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof departmentControllerDelete>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List roles with keyset pagination
 */
export type roleControllerListResponse200 = {
    data: RoleListResponseDto;
    status: 200;
};
export type roleControllerListResponseSuccess = (roleControllerListResponse200) & {
    headers: Headers;
};
export type roleControllerListResponse = (roleControllerListResponseSuccess);
export declare const getRoleControllerListUrl: () => string;
export declare const roleControllerList: (options?: RequestInit) => Promise<roleControllerListResponse>;
export declare const getRoleControllerListQueryKey: () => readonly ["/api/v1/roles"];
export declare const getRoleControllerListQueryOptions: <TData = Awaited<ReturnType<typeof roleControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type RoleControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof roleControllerList>>>;
export type RoleControllerListQueryError = unknown;
export declare function useRoleControllerList<TData = Awaited<ReturnType<typeof roleControllerList>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, Awaited<ReturnType<typeof roleControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useRoleControllerList<TData = Awaited<ReturnType<typeof roleControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, Awaited<ReturnType<typeof roleControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useRoleControllerList<TData = Awaited<ReturnType<typeof roleControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create role
 */
export type roleControllerCreateResponse201 = {
    data: RoleResponseDto;
    status: 201;
};
export type roleControllerCreateResponseSuccess = (roleControllerCreateResponse201) & {
    headers: Headers;
};
export type roleControllerCreateResponse = (roleControllerCreateResponseSuccess);
export declare const getRoleControllerCreateUrl: () => string;
export declare const roleControllerCreate: (createRoleDto: CreateRoleDto, options?: RequestInit) => Promise<roleControllerCreateResponse>;
export declare const getRoleControllerCreateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof roleControllerCreate>>, TError, {
        data: CreateRoleDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof roleControllerCreate>>, TError, {
    data: CreateRoleDto;
}, TContext>;
export type RoleControllerCreateMutationResult = NonNullable<Awaited<ReturnType<typeof roleControllerCreate>>>;
export type RoleControllerCreateMutationBody = CreateRoleDto;
export type RoleControllerCreateMutationError = unknown;
/**
* @summary Create role
*/
export declare const useRoleControllerCreate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof roleControllerCreate>>, TError, {
        data: CreateRoleDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof roleControllerCreate>>, TError, {
    data: CreateRoleDto;
}, TContext>;
/**
 * @summary Get active roles for a department
 */
export type roleControllerGetOptionsResponse200 = {
    data: RoleOptionDto[];
    status: 200;
};
export type roleControllerGetOptionsResponseSuccess = (roleControllerGetOptionsResponse200) & {
    headers: Headers;
};
export type roleControllerGetOptionsResponse = (roleControllerGetOptionsResponseSuccess);
export declare const getRoleControllerGetOptionsUrl: (params: RoleControllerGetOptionsParams) => string;
export declare const roleControllerGetOptions: (params: RoleControllerGetOptionsParams, options?: RequestInit) => Promise<roleControllerGetOptionsResponse>;
export declare const getRoleControllerGetOptionsQueryKey: (params?: RoleControllerGetOptionsParams) => readonly ["/api/v1/roles/options", ...RoleControllerGetOptionsParams[]];
export declare const getRoleControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof roleControllerGetOptions>>, TError = unknown>(params: RoleControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type RoleControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof roleControllerGetOptions>>>;
export type RoleControllerGetOptionsQueryError = unknown;
export declare function useRoleControllerGetOptions<TData = Awaited<ReturnType<typeof roleControllerGetOptions>>, TError = unknown>(params: RoleControllerGetOptionsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof roleControllerGetOptions>>, TError, Awaited<ReturnType<typeof roleControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useRoleControllerGetOptions<TData = Awaited<ReturnType<typeof roleControllerGetOptions>>, TError = unknown>(params: RoleControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof roleControllerGetOptions>>, TError, Awaited<ReturnType<typeof roleControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useRoleControllerGetOptions<TData = Awaited<ReturnType<typeof roleControllerGetOptions>>, TError = unknown>(params: RoleControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get role details by ID
 */
export type roleControllerGetByIdResponse200 = {
    data: RoleResponseDto;
    status: 200;
};
export type roleControllerGetByIdResponseSuccess = (roleControllerGetByIdResponse200) & {
    headers: Headers;
};
export type roleControllerGetByIdResponse = (roleControllerGetByIdResponseSuccess);
export declare const getRoleControllerGetByIdUrl: (id: number) => string;
export declare const roleControllerGetById: (id: number, options?: RequestInit) => Promise<roleControllerGetByIdResponse>;
export declare const getRoleControllerGetByIdQueryKey: (id?: number) => readonly ["/api/v1/roles/undefined" | `/api/v1/roles/${number}`];
export declare const getRoleControllerGetByIdQueryOptions: <TData = Awaited<ReturnType<typeof roleControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetById>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type RoleControllerGetByIdQueryResult = NonNullable<Awaited<ReturnType<typeof roleControllerGetById>>>;
export type RoleControllerGetByIdQueryError = unknown;
export declare function useRoleControllerGetById<TData = Awaited<ReturnType<typeof roleControllerGetById>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetById>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof roleControllerGetById>>, TError, Awaited<ReturnType<typeof roleControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useRoleControllerGetById<TData = Awaited<ReturnType<typeof roleControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetById>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof roleControllerGetById>>, TError, Awaited<ReturnType<typeof roleControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useRoleControllerGetById<TData = Awaited<ReturnType<typeof roleControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update role
 */
export type roleControllerUpdateResponse200 = {
    data: RoleResponseDto;
    status: 200;
};
export type roleControllerUpdateResponseSuccess = (roleControllerUpdateResponse200) & {
    headers: Headers;
};
export type roleControllerUpdateResponse = (roleControllerUpdateResponseSuccess);
export declare const getRoleControllerUpdateUrl: (id: number) => string;
export declare const roleControllerUpdate: (id: number, updateRoleDto: UpdateRoleDto, options?: RequestInit) => Promise<roleControllerUpdateResponse>;
export declare const getRoleControllerUpdateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof roleControllerUpdate>>, TError, {
        id: number;
        data: UpdateRoleDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof roleControllerUpdate>>, TError, {
    id: number;
    data: UpdateRoleDto;
}, TContext>;
export type RoleControllerUpdateMutationResult = NonNullable<Awaited<ReturnType<typeof roleControllerUpdate>>>;
export type RoleControllerUpdateMutationBody = UpdateRoleDto;
export type RoleControllerUpdateMutationError = unknown;
/**
* @summary Update role
*/
export declare const useRoleControllerUpdate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof roleControllerUpdate>>, TError, {
        id: number;
        data: UpdateRoleDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof roleControllerUpdate>>, TError, {
    id: number;
    data: UpdateRoleDto;
}, TContext>;
/**
 * @summary Soft delete role
 */
export type roleControllerDeleteResponse204 = {
    data: void;
    status: 204;
};
export type roleControllerDeleteResponseSuccess = (roleControllerDeleteResponse204) & {
    headers: Headers;
};
export type roleControllerDeleteResponse = (roleControllerDeleteResponseSuccess);
export declare const getRoleControllerDeleteUrl: (id: number) => string;
export declare const roleControllerDelete: (id: number, options?: RequestInit) => Promise<roleControllerDeleteResponse>;
export declare const getRoleControllerDeleteMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof roleControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof roleControllerDelete>>, TError, {
    id: number;
}, TContext>;
export type RoleControllerDeleteMutationResult = NonNullable<Awaited<ReturnType<typeof roleControllerDelete>>>;
export type RoleControllerDeleteMutationError = unknown;
/**
* @summary Soft delete role
*/
export declare const useRoleControllerDelete: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof roleControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof roleControllerDelete>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List employees with keyset pagination
 */
export type employeeControllerListResponse200 = {
    data: EmployeeListResponseDto;
    status: 200;
};
export type employeeControllerListResponseSuccess = (employeeControllerListResponse200) & {
    headers: Headers;
};
export type employeeControllerListResponse = (employeeControllerListResponseSuccess);
export declare const getEmployeeControllerListUrl: () => string;
export declare const employeeControllerList: (options?: RequestInit) => Promise<employeeControllerListResponse>;
export declare const getEmployeeControllerListQueryKey: () => readonly ["/api/v1/employees"];
export declare const getEmployeeControllerListQueryOptions: <TData = Awaited<ReturnType<typeof employeeControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type EmployeeControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof employeeControllerList>>>;
export type EmployeeControllerListQueryError = unknown;
export declare function useEmployeeControllerList<TData = Awaited<ReturnType<typeof employeeControllerList>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, Awaited<ReturnType<typeof employeeControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerList<TData = Awaited<ReturnType<typeof employeeControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, Awaited<ReturnType<typeof employeeControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerList<TData = Awaited<ReturnType<typeof employeeControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create employee and provision credentials
 */
export type employeeControllerCreateResponse201 = {
    data: EmployeeResponseDto;
    status: 201;
};
export type employeeControllerCreateResponseSuccess = (employeeControllerCreateResponse201) & {
    headers: Headers;
};
export type employeeControllerCreateResponse = (employeeControllerCreateResponseSuccess);
export declare const getEmployeeControllerCreateUrl: () => string;
export declare const employeeControllerCreate: (createEmployeeDto: CreateEmployeeDto, options?: RequestInit) => Promise<employeeControllerCreateResponse>;
export declare const getEmployeeControllerCreateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerCreate>>, TError, {
        data: CreateEmployeeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof employeeControllerCreate>>, TError, {
    data: CreateEmployeeDto;
}, TContext>;
export type EmployeeControllerCreateMutationResult = NonNullable<Awaited<ReturnType<typeof employeeControllerCreate>>>;
export type EmployeeControllerCreateMutationBody = CreateEmployeeDto;
export type EmployeeControllerCreateMutationError = unknown;
/**
* @summary Create employee and provision credentials
*/
export declare const useEmployeeControllerCreate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerCreate>>, TError, {
        data: CreateEmployeeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof employeeControllerCreate>>, TError, {
    data: CreateEmployeeDto;
}, TContext>;
/**
 * @summary Get active employees for manager dropdown select
 */
export type employeeControllerGetOptionsResponse200 = {
    data: EmployeeOptionDto[];
    status: 200;
};
export type employeeControllerGetOptionsResponseSuccess = (employeeControllerGetOptionsResponse200) & {
    headers: Headers;
};
export type employeeControllerGetOptionsResponse = (employeeControllerGetOptionsResponseSuccess);
export declare const getEmployeeControllerGetOptionsUrl: (params?: EmployeeControllerGetOptionsParams) => string;
export declare const employeeControllerGetOptions: (params?: EmployeeControllerGetOptionsParams, options?: RequestInit) => Promise<employeeControllerGetOptionsResponse>;
export declare const getEmployeeControllerGetOptionsQueryKey: (params?: EmployeeControllerGetOptionsParams) => readonly ["/api/v1/employees/options", ...EmployeeControllerGetOptionsParams[]];
export declare const getEmployeeControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError = unknown>(params?: EmployeeControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type EmployeeControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof employeeControllerGetOptions>>>;
export type EmployeeControllerGetOptionsQueryError = unknown;
export declare function useEmployeeControllerGetOptions<TData = Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError = unknown>(params: undefined | EmployeeControllerGetOptionsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError, Awaited<ReturnType<typeof employeeControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerGetOptions<TData = Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError = unknown>(params?: EmployeeControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError, Awaited<ReturnType<typeof employeeControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerGetOptions<TData = Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError = unknown>(params?: EmployeeControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get employee details by ID
 */
export type employeeControllerGetByIdResponse200 = {
    data: EmployeeResponseDto;
    status: 200;
};
export type employeeControllerGetByIdResponseSuccess = (employeeControllerGetByIdResponse200) & {
    headers: Headers;
};
export type employeeControllerGetByIdResponse = (employeeControllerGetByIdResponseSuccess);
export declare const getEmployeeControllerGetByIdUrl: (id: number) => string;
export declare const employeeControllerGetById: (id: number, options?: RequestInit) => Promise<employeeControllerGetByIdResponse>;
export declare const getEmployeeControllerGetByIdQueryKey: (id?: number) => readonly ["/api/v1/employees/undefined" | `/api/v1/employees/${number}`];
export declare const getEmployeeControllerGetByIdQueryOptions: <TData = Awaited<ReturnType<typeof employeeControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetById>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type EmployeeControllerGetByIdQueryResult = NonNullable<Awaited<ReturnType<typeof employeeControllerGetById>>>;
export type EmployeeControllerGetByIdQueryError = unknown;
export declare function useEmployeeControllerGetById<TData = Awaited<ReturnType<typeof employeeControllerGetById>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetById>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerGetById>>, TError, Awaited<ReturnType<typeof employeeControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerGetById<TData = Awaited<ReturnType<typeof employeeControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetById>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerGetById>>, TError, Awaited<ReturnType<typeof employeeControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerGetById<TData = Awaited<ReturnType<typeof employeeControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update employee details
 */
export type employeeControllerUpdateResponse200 = {
    data: EmployeeResponseDto;
    status: 200;
};
export type employeeControllerUpdateResponseSuccess = (employeeControllerUpdateResponse200) & {
    headers: Headers;
};
export type employeeControllerUpdateResponse = (employeeControllerUpdateResponseSuccess);
export declare const getEmployeeControllerUpdateUrl: (id: number) => string;
export declare const employeeControllerUpdate: (id: number, updateEmployeeDto: UpdateEmployeeDto, options?: RequestInit) => Promise<employeeControllerUpdateResponse>;
export declare const getEmployeeControllerUpdateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerUpdate>>, TError, {
        id: number;
        data: UpdateEmployeeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof employeeControllerUpdate>>, TError, {
    id: number;
    data: UpdateEmployeeDto;
}, TContext>;
export type EmployeeControllerUpdateMutationResult = NonNullable<Awaited<ReturnType<typeof employeeControllerUpdate>>>;
export type EmployeeControllerUpdateMutationBody = UpdateEmployeeDto;
export type EmployeeControllerUpdateMutationError = unknown;
/**
* @summary Update employee details
*/
export declare const useEmployeeControllerUpdate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerUpdate>>, TError, {
        id: number;
        data: UpdateEmployeeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof employeeControllerUpdate>>, TError, {
    id: number;
    data: UpdateEmployeeDto;
}, TContext>;
/**
 * @summary Soft delete employee
 */
export type employeeControllerDeleteResponse204 = {
    data: void;
    status: 204;
};
export type employeeControllerDeleteResponseSuccess = (employeeControllerDeleteResponse204) & {
    headers: Headers;
};
export type employeeControllerDeleteResponse = (employeeControllerDeleteResponseSuccess);
export declare const getEmployeeControllerDeleteUrl: (id: number) => string;
export declare const employeeControllerDelete: (id: number, options?: RequestInit) => Promise<employeeControllerDeleteResponse>;
export declare const getEmployeeControllerDeleteMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof employeeControllerDelete>>, TError, {
    id: number;
}, TContext>;
export type EmployeeControllerDeleteMutationResult = NonNullable<Awaited<ReturnType<typeof employeeControllerDelete>>>;
export type EmployeeControllerDeleteMutationError = unknown;
/**
* @summary Soft delete employee
*/
export declare const useEmployeeControllerDelete: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof employeeControllerDelete>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Upload employee profile photo (max 5MB, JPEG/PNG)
 */
export type employeeControllerUploadPhotoResponse200 = {
    data: EmployeeResponseDto;
    status: 200;
};
export type employeeControllerUploadPhotoResponse413 = {
    data: void;
    status: 413;
};
export type employeeControllerUploadPhotoResponse415 = {
    data: void;
    status: 415;
};
export type employeeControllerUploadPhotoResponseSuccess = (employeeControllerUploadPhotoResponse200) & {
    headers: Headers;
};
export type employeeControllerUploadPhotoResponseError = (employeeControllerUploadPhotoResponse413 | employeeControllerUploadPhotoResponse415) & {
    headers: Headers;
};
export type employeeControllerUploadPhotoResponse = (employeeControllerUploadPhotoResponseSuccess | employeeControllerUploadPhotoResponseError);
export declare const getEmployeeControllerUploadPhotoUrl: (id: number) => string;
export declare const employeeControllerUploadPhoto: (id: number, employeeControllerUploadPhotoBody: EmployeeControllerUploadPhotoBody, options?: RequestInit) => Promise<employeeControllerUploadPhotoResponse>;
export declare const getEmployeeControllerUploadPhotoMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerUploadPhoto>>, TError, {
        id: number;
        data: EmployeeControllerUploadPhotoBody;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof employeeControllerUploadPhoto>>, TError, {
    id: number;
    data: EmployeeControllerUploadPhotoBody;
}, TContext>;
export type EmployeeControllerUploadPhotoMutationResult = NonNullable<Awaited<ReturnType<typeof employeeControllerUploadPhoto>>>;
export type EmployeeControllerUploadPhotoMutationBody = EmployeeControllerUploadPhotoBody;
export type EmployeeControllerUploadPhotoMutationError = void;
/**
* @summary Upload employee profile photo (max 5MB, JPEG/PNG)
*/
export declare const useEmployeeControllerUploadPhoto: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerUploadPhoto>>, TError, {
        id: number;
        data: EmployeeControllerUploadPhotoBody;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof employeeControllerUploadPhoto>>, TError, {
    id: number;
    data: EmployeeControllerUploadPhotoBody;
}, TContext>;
/**
 * @summary Remove employee profile photo
 */
export type employeeControllerRemovePhotoResponse204 = {
    data: void;
    status: 204;
};
export type employeeControllerRemovePhotoResponseSuccess = (employeeControllerRemovePhotoResponse204) & {
    headers: Headers;
};
export type employeeControllerRemovePhotoResponse = (employeeControllerRemovePhotoResponseSuccess);
export declare const getEmployeeControllerRemovePhotoUrl: (id: number) => string;
export declare const employeeControllerRemovePhoto: (id: number, options?: RequestInit) => Promise<employeeControllerRemovePhotoResponse>;
export declare const getEmployeeControllerRemovePhotoMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerRemovePhoto>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof employeeControllerRemovePhoto>>, TError, {
    id: number;
}, TContext>;
export type EmployeeControllerRemovePhotoMutationResult = NonNullable<Awaited<ReturnType<typeof employeeControllerRemovePhoto>>>;
export type EmployeeControllerRemovePhotoMutationError = unknown;
/**
* @summary Remove employee profile photo
*/
export declare const useEmployeeControllerRemovePhoto: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerRemovePhoto>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof employeeControllerRemovePhoto>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List industries with filters and keyset pagination
 */
export type industryControllerListResponse200 = {
    data: ListIndustriesResponseDto;
    status: 200;
};
export type industryControllerListResponseSuccess = (industryControllerListResponse200) & {
    headers: Headers;
};
export type industryControllerListResponse = (industryControllerListResponseSuccess);
export declare const getIndustryControllerListUrl: () => string;
export declare const industryControllerList: (options?: RequestInit) => Promise<industryControllerListResponse>;
export declare const getIndustryControllerListQueryKey: () => readonly ["/api/v1/industries"];
export declare const getIndustryControllerListQueryOptions: <TData = Awaited<ReturnType<typeof industryControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type IndustryControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof industryControllerList>>>;
export type IndustryControllerListQueryError = unknown;
export declare function useIndustryControllerList<TData = Awaited<ReturnType<typeof industryControllerList>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, Awaited<ReturnType<typeof industryControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerList<TData = Awaited<ReturnType<typeof industryControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, Awaited<ReturnType<typeof industryControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerList<TData = Awaited<ReturnType<typeof industryControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create an industry or sub-industry
 */
export type industryControllerCreateResponse201 = {
    data: IndustryDetailResponseDto;
    status: 201;
};
export type industryControllerCreateResponseSuccess = (industryControllerCreateResponse201) & {
    headers: Headers;
};
export type industryControllerCreateResponse = (industryControllerCreateResponseSuccess);
export declare const getIndustryControllerCreateUrl: () => string;
export declare const industryControllerCreate: (createIndustryDto: CreateIndustryDto, options?: RequestInit) => Promise<industryControllerCreateResponse>;
export declare const getIndustryControllerCreateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof industryControllerCreate>>, TError, {
        data: CreateIndustryDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof industryControllerCreate>>, TError, {
    data: CreateIndustryDto;
}, TContext>;
export type IndustryControllerCreateMutationResult = NonNullable<Awaited<ReturnType<typeof industryControllerCreate>>>;
export type IndustryControllerCreateMutationBody = CreateIndustryDto;
export type IndustryControllerCreateMutationError = unknown;
/**
* @summary Create an industry or sub-industry
*/
export declare const useIndustryControllerCreate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof industryControllerCreate>>, TError, {
        data: CreateIndustryDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof industryControllerCreate>>, TError, {
    data: CreateIndustryDto;
}, TContext>;
/**
 * @summary Get active industry options (top-level or sub-industries of parent_id)
 */
export type industryControllerGetOptionsResponse200 = {
    data: IndustryOptionDto[];
    status: 200;
};
export type industryControllerGetOptionsResponseSuccess = (industryControllerGetOptionsResponse200) & {
    headers: Headers;
};
export type industryControllerGetOptionsResponse = (industryControllerGetOptionsResponseSuccess);
export declare const getIndustryControllerGetOptionsUrl: () => string;
export declare const industryControllerGetOptions: (options?: RequestInit) => Promise<industryControllerGetOptionsResponse>;
export declare const getIndustryControllerGetOptionsQueryKey: () => readonly ["/api/v1/industries/options"];
export declare const getIndustryControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof industryControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type IndustryControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof industryControllerGetOptions>>>;
export type IndustryControllerGetOptionsQueryError = unknown;
export declare function useIndustryControllerGetOptions<TData = Awaited<ReturnType<typeof industryControllerGetOptions>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, Awaited<ReturnType<typeof industryControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerGetOptions<TData = Awaited<ReturnType<typeof industryControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, Awaited<ReturnType<typeof industryControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerGetOptions<TData = Awaited<ReturnType<typeof industryControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get industry details by ID
 */
export type industryControllerGetByIdResponse200 = {
    data: IndustryDetailResponseDto;
    status: 200;
};
export type industryControllerGetByIdResponseSuccess = (industryControllerGetByIdResponse200) & {
    headers: Headers;
};
export type industryControllerGetByIdResponse = (industryControllerGetByIdResponseSuccess);
export declare const getIndustryControllerGetByIdUrl: (id: number) => string;
export declare const industryControllerGetById: (id: number, options?: RequestInit) => Promise<industryControllerGetByIdResponse>;
export declare const getIndustryControllerGetByIdQueryKey: (id?: number) => readonly ["/api/v1/industries/undefined" | `/api/v1/industries/${number}`];
export declare const getIndustryControllerGetByIdQueryOptions: <TData = Awaited<ReturnType<typeof industryControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetById>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type IndustryControllerGetByIdQueryResult = NonNullable<Awaited<ReturnType<typeof industryControllerGetById>>>;
export type IndustryControllerGetByIdQueryError = unknown;
export declare function useIndustryControllerGetById<TData = Awaited<ReturnType<typeof industryControllerGetById>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetById>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerGetById>>, TError, Awaited<ReturnType<typeof industryControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerGetById<TData = Awaited<ReturnType<typeof industryControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetById>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerGetById>>, TError, Awaited<ReturnType<typeof industryControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerGetById<TData = Awaited<ReturnType<typeof industryControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update industry name or active status
 */
export type industryControllerUpdateResponse200 = {
    data: IndustryDetailResponseDto;
    status: 200;
};
export type industryControllerUpdateResponseSuccess = (industryControllerUpdateResponse200) & {
    headers: Headers;
};
export type industryControllerUpdateResponse = (industryControllerUpdateResponseSuccess);
export declare const getIndustryControllerUpdateUrl: (id: number) => string;
export declare const industryControllerUpdate: (id: number, updateIndustryDto: UpdateIndustryDto, options?: RequestInit) => Promise<industryControllerUpdateResponse>;
export declare const getIndustryControllerUpdateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof industryControllerUpdate>>, TError, {
        id: number;
        data: UpdateIndustryDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof industryControllerUpdate>>, TError, {
    id: number;
    data: UpdateIndustryDto;
}, TContext>;
export type IndustryControllerUpdateMutationResult = NonNullable<Awaited<ReturnType<typeof industryControllerUpdate>>>;
export type IndustryControllerUpdateMutationBody = UpdateIndustryDto;
export type IndustryControllerUpdateMutationError = unknown;
/**
* @summary Update industry name or active status
*/
export declare const useIndustryControllerUpdate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof industryControllerUpdate>>, TError, {
        id: number;
        data: UpdateIndustryDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof industryControllerUpdate>>, TError, {
    id: number;
    data: UpdateIndustryDto;
}, TContext>;
/**
 * @summary Soft delete an industry
 */
export type industryControllerDeleteResponse204 = {
    data: void;
    status: 204;
};
export type industryControllerDeleteResponseSuccess = (industryControllerDeleteResponse204) & {
    headers: Headers;
};
export type industryControllerDeleteResponse = (industryControllerDeleteResponseSuccess);
export declare const getIndustryControllerDeleteUrl: (id: number) => string;
export declare const industryControllerDelete: (id: number, options?: RequestInit) => Promise<industryControllerDeleteResponse>;
export declare const getIndustryControllerDeleteMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof industryControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof industryControllerDelete>>, TError, {
    id: number;
}, TContext>;
export type IndustryControllerDeleteMutationResult = NonNullable<Awaited<ReturnType<typeof industryControllerDelete>>>;
export type IndustryControllerDeleteMutationError = unknown;
/**
* @summary Soft delete an industry
*/
export declare const useIndustryControllerDelete: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof industryControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof industryControllerDelete>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List customer types with filters and keyset pagination
 */
export type customerTypeControllerListResponse200 = {
    data: ListCustomerTypesResponseDto;
    status: 200;
};
export type customerTypeControllerListResponseSuccess = (customerTypeControllerListResponse200) & {
    headers: Headers;
};
export type customerTypeControllerListResponse = (customerTypeControllerListResponseSuccess);
export declare const getCustomerTypeControllerListUrl: () => string;
export declare const customerTypeControllerList: (options?: RequestInit) => Promise<customerTypeControllerListResponse>;
export declare const getCustomerTypeControllerListQueryKey: () => readonly ["/api/v1/customer-types"];
export declare const getCustomerTypeControllerListQueryOptions: <TData = Awaited<ReturnType<typeof customerTypeControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CustomerTypeControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof customerTypeControllerList>>>;
export type CustomerTypeControllerListQueryError = unknown;
export declare function useCustomerTypeControllerList<TData = Awaited<ReturnType<typeof customerTypeControllerList>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, Awaited<ReturnType<typeof customerTypeControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCustomerTypeControllerList<TData = Awaited<ReturnType<typeof customerTypeControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, Awaited<ReturnType<typeof customerTypeControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCustomerTypeControllerList<TData = Awaited<ReturnType<typeof customerTypeControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a customer type
 */
export type customerTypeControllerCreateResponse201 = {
    data: CustomerTypeItemDto;
    status: 201;
};
export type customerTypeControllerCreateResponseSuccess = (customerTypeControllerCreateResponse201) & {
    headers: Headers;
};
export type customerTypeControllerCreateResponse = (customerTypeControllerCreateResponseSuccess);
export declare const getCustomerTypeControllerCreateUrl: () => string;
export declare const customerTypeControllerCreate: (createCustomerTypeDto: CreateCustomerTypeDto, options?: RequestInit) => Promise<customerTypeControllerCreateResponse>;
export declare const getCustomerTypeControllerCreateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerCreate>>, TError, {
        data: CreateCustomerTypeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerCreate>>, TError, {
    data: CreateCustomerTypeDto;
}, TContext>;
export type CustomerTypeControllerCreateMutationResult = NonNullable<Awaited<ReturnType<typeof customerTypeControllerCreate>>>;
export type CustomerTypeControllerCreateMutationBody = CreateCustomerTypeDto;
export type CustomerTypeControllerCreateMutationError = unknown;
/**
* @summary Create a customer type
*/
export declare const useCustomerTypeControllerCreate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerCreate>>, TError, {
        data: CreateCustomerTypeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof customerTypeControllerCreate>>, TError, {
    data: CreateCustomerTypeDto;
}, TContext>;
/**
 * @summary Get active customer type options
 */
export type customerTypeControllerGetOptionsResponse200 = {
    data: CustomerTypeOptionDto[];
    status: 200;
};
export type customerTypeControllerGetOptionsResponseSuccess = (customerTypeControllerGetOptionsResponse200) & {
    headers: Headers;
};
export type customerTypeControllerGetOptionsResponse = (customerTypeControllerGetOptionsResponseSuccess);
export declare const getCustomerTypeControllerGetOptionsUrl: () => string;
export declare const customerTypeControllerGetOptions: (options?: RequestInit) => Promise<customerTypeControllerGetOptionsResponse>;
export declare const getCustomerTypeControllerGetOptionsQueryKey: () => readonly ["/api/v1/customer-types/options"];
export declare const getCustomerTypeControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CustomerTypeControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof customerTypeControllerGetOptions>>>;
export type CustomerTypeControllerGetOptionsQueryError = unknown;
export declare function useCustomerTypeControllerGetOptions<TData = Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError, Awaited<ReturnType<typeof customerTypeControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCustomerTypeControllerGetOptions<TData = Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError, Awaited<ReturnType<typeof customerTypeControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCustomerTypeControllerGetOptions<TData = Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get customer type details by ID
 */
export type customerTypeControllerGetByIdResponse200 = {
    data: CustomerTypeItemDto;
    status: 200;
};
export type customerTypeControllerGetByIdResponseSuccess = (customerTypeControllerGetByIdResponse200) & {
    headers: Headers;
};
export type customerTypeControllerGetByIdResponse = (customerTypeControllerGetByIdResponseSuccess);
export declare const getCustomerTypeControllerGetByIdUrl: (id: number) => string;
export declare const customerTypeControllerGetById: (id: number, options?: RequestInit) => Promise<customerTypeControllerGetByIdResponse>;
export declare const getCustomerTypeControllerGetByIdQueryKey: (id?: number) => readonly ["/api/v1/customer-types/undefined" | `/api/v1/customer-types/${number}`];
export declare const getCustomerTypeControllerGetByIdQueryOptions: <TData = Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CustomerTypeControllerGetByIdQueryResult = NonNullable<Awaited<ReturnType<typeof customerTypeControllerGetById>>>;
export type CustomerTypeControllerGetByIdQueryError = unknown;
export declare function useCustomerTypeControllerGetById<TData = Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError, Awaited<ReturnType<typeof customerTypeControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCustomerTypeControllerGetById<TData = Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError, Awaited<ReturnType<typeof customerTypeControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCustomerTypeControllerGetById<TData = Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update customer type (name, is_active, or is_default)
 */
export type customerTypeControllerUpdateResponse200 = {
    data: CustomerTypeItemDto;
    status: 200;
};
export type customerTypeControllerUpdateResponseSuccess = (customerTypeControllerUpdateResponse200) & {
    headers: Headers;
};
export type customerTypeControllerUpdateResponse = (customerTypeControllerUpdateResponseSuccess);
export declare const getCustomerTypeControllerUpdateUrl: (id: number) => string;
export declare const customerTypeControllerUpdate: (id: number, updateCustomerTypeDto: UpdateCustomerTypeDto, options?: RequestInit) => Promise<customerTypeControllerUpdateResponse>;
export declare const getCustomerTypeControllerUpdateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerUpdate>>, TError, {
        id: number;
        data: UpdateCustomerTypeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerUpdate>>, TError, {
    id: number;
    data: UpdateCustomerTypeDto;
}, TContext>;
export type CustomerTypeControllerUpdateMutationResult = NonNullable<Awaited<ReturnType<typeof customerTypeControllerUpdate>>>;
export type CustomerTypeControllerUpdateMutationBody = UpdateCustomerTypeDto;
export type CustomerTypeControllerUpdateMutationError = unknown;
/**
* @summary Update customer type (name, is_active, or is_default)
*/
export declare const useCustomerTypeControllerUpdate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerUpdate>>, TError, {
        id: number;
        data: UpdateCustomerTypeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof customerTypeControllerUpdate>>, TError, {
    id: number;
    data: UpdateCustomerTypeDto;
}, TContext>;
/**
 * @summary Soft delete a customer type
 */
export type customerTypeControllerDeleteResponse204 = {
    data: void;
    status: 204;
};
export type customerTypeControllerDeleteResponseSuccess = (customerTypeControllerDeleteResponse204) & {
    headers: Headers;
};
export type customerTypeControllerDeleteResponse = (customerTypeControllerDeleteResponseSuccess);
export declare const getCustomerTypeControllerDeleteUrl: (id: number) => string;
export declare const customerTypeControllerDelete: (id: number, options?: RequestInit) => Promise<customerTypeControllerDeleteResponse>;
export declare const getCustomerTypeControllerDeleteMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerDelete>>, TError, {
    id: number;
}, TContext>;
export type CustomerTypeControllerDeleteMutationResult = NonNullable<Awaited<ReturnType<typeof customerTypeControllerDelete>>>;
export type CustomerTypeControllerDeleteMutationError = unknown;
/**
* @summary Soft delete a customer type
*/
export declare const useCustomerTypeControllerDelete: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof customerTypeControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof customerTypeControllerDelete>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get active lookup options by type (e.g. person_department)
 */
export type lookupControllerGetOptionsResponse200 = {
    data: LookupOptionDto[];
    status: 200;
};
export type lookupControllerGetOptionsResponseSuccess = (lookupControllerGetOptionsResponse200) & {
    headers: Headers;
};
export type lookupControllerGetOptionsResponse = (lookupControllerGetOptionsResponseSuccess);
export declare const getLookupControllerGetOptionsUrl: () => string;
export declare const lookupControllerGetOptions: (options?: RequestInit) => Promise<lookupControllerGetOptionsResponse>;
export declare const getLookupControllerGetOptionsQueryKey: () => readonly ["/api/v1/lookups/options"];
export declare const getLookupControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type LookupControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof lookupControllerGetOptions>>>;
export type LookupControllerGetOptionsQueryError = unknown;
export declare function useLookupControllerGetOptions<TData = Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, Awaited<ReturnType<typeof lookupControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useLookupControllerGetOptions<TData = Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, Awaited<ReturnType<typeof lookupControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useLookupControllerGetOptions<TData = Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Download empty company import template (xlsx or csv)
 */
export type companyDataTransferControllerDownloadTemplateResponse200 = {
    data: void;
    status: 200;
};
export type companyDataTransferControllerDownloadTemplateResponseSuccess = (companyDataTransferControllerDownloadTemplateResponse200) & {
    headers: Headers;
};
export type companyDataTransferControllerDownloadTemplateResponse = (companyDataTransferControllerDownloadTemplateResponseSuccess);
export declare const getCompanyDataTransferControllerDownloadTemplateUrl: () => string;
export declare const companyDataTransferControllerDownloadTemplate: (options?: RequestInit) => Promise<companyDataTransferControllerDownloadTemplateResponse>;
export declare const getCompanyDataTransferControllerDownloadTemplateQueryKey: () => readonly ["/api/v1/companies/import/template"];
export declare const getCompanyDataTransferControllerDownloadTemplateQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerDownloadTemplateQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>>;
export type CompanyDataTransferControllerDownloadTemplateQueryError = unknown;
export declare function useCompanyDataTransferControllerDownloadTemplate<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerDownloadTemplate<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerDownloadTemplate<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Upload file for inspection and preview (rate limit 5/min)
 */
export type companyDataTransferControllerPreviewResponse200 = {
    data: CompanyImportPreviewResponseDto;
    status: 200;
};
export type companyDataTransferControllerPreviewResponseSuccess = (companyDataTransferControllerPreviewResponse200) & {
    headers: Headers;
};
export type companyDataTransferControllerPreviewResponse = (companyDataTransferControllerPreviewResponseSuccess);
export declare const getCompanyDataTransferControllerPreviewUrl: () => string;
export declare const companyDataTransferControllerPreview: (companyDataTransferControllerPreviewBody: CompanyDataTransferControllerPreviewBody, options?: RequestInit) => Promise<companyDataTransferControllerPreviewResponse>;
export declare const getCompanyDataTransferControllerPreviewMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerPreview>>, TError, {
        data: CompanyDataTransferControllerPreviewBody;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerPreview>>, TError, {
    data: CompanyDataTransferControllerPreviewBody;
}, TContext>;
export type CompanyDataTransferControllerPreviewMutationResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerPreview>>>;
export type CompanyDataTransferControllerPreviewMutationBody = CompanyDataTransferControllerPreviewBody;
export type CompanyDataTransferControllerPreviewMutationError = unknown;
/**
* @summary Upload file for inspection and preview (rate limit 5/min)
*/
export declare const useCompanyDataTransferControllerPreview: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerPreview>>, TError, {
        data: CompanyDataTransferControllerPreviewBody;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof companyDataTransferControllerPreview>>, TError, {
    data: CompanyDataTransferControllerPreviewBody;
}, TContext>;
/**
 * @summary Confirm import preview and enqueue background processing (rate limit 5/min)
 */
export type companyDataTransferControllerConfirmResponse202 = {
    data: CompanyImportConfirmResponseDto;
    status: 202;
};
export type companyDataTransferControllerConfirmResponseSuccess = (companyDataTransferControllerConfirmResponse202) & {
    headers: Headers;
};
export type companyDataTransferControllerConfirmResponse = (companyDataTransferControllerConfirmResponseSuccess);
export declare const getCompanyDataTransferControllerConfirmUrl: (jobId: string) => string;
export declare const companyDataTransferControllerConfirm: (jobId: string, options?: RequestInit) => Promise<companyDataTransferControllerConfirmResponse>;
export declare const getCompanyDataTransferControllerConfirmMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>, TError, {
        jobId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>, TError, {
    jobId: string;
}, TContext>;
export type CompanyDataTransferControllerConfirmMutationResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>>;
export type CompanyDataTransferControllerConfirmMutationError = unknown;
/**
* @summary Confirm import preview and enqueue background processing (rate limit 5/min)
*/
export declare const useCompanyDataTransferControllerConfirm: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>, TError, {
        jobId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>, TError, {
    jobId: string;
}, TContext>;
/**
 * @summary Cancel import job (only if pending)
 */
export type companyDataTransferControllerCancelResponse201 = {
    data: void;
    status: 201;
};
export type companyDataTransferControllerCancelResponseSuccess = (companyDataTransferControllerCancelResponse201) & {
    headers: Headers;
};
export type companyDataTransferControllerCancelResponse = (companyDataTransferControllerCancelResponseSuccess);
export declare const getCompanyDataTransferControllerCancelUrl: (jobId: string) => string;
export declare const companyDataTransferControllerCancel: (jobId: string, options?: RequestInit) => Promise<companyDataTransferControllerCancelResponse>;
export declare const getCompanyDataTransferControllerCancelMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerCancel>>, TError, {
        jobId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerCancel>>, TError, {
    jobId: string;
}, TContext>;
export type CompanyDataTransferControllerCancelMutationResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerCancel>>>;
export type CompanyDataTransferControllerCancelMutationError = unknown;
/**
* @summary Cancel import job (only if pending)
*/
export declare const useCompanyDataTransferControllerCancel: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerCancel>>, TError, {
        jobId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof companyDataTransferControllerCancel>>, TError, {
    jobId: string;
}, TContext>;
/**
 * @summary List recent company import jobs
 */
export type companyDataTransferControllerListImportsResponse200 = {
    data: TransferJobListResponseDto;
    status: 200;
};
export type companyDataTransferControllerListImportsResponseSuccess = (companyDataTransferControllerListImportsResponse200) & {
    headers: Headers;
};
export type companyDataTransferControllerListImportsResponse = (companyDataTransferControllerListImportsResponseSuccess);
export declare const getCompanyDataTransferControllerListImportsUrl: () => string;
export declare const companyDataTransferControllerListImports: (options?: RequestInit) => Promise<companyDataTransferControllerListImportsResponse>;
export declare const getCompanyDataTransferControllerListImportsQueryKey: () => readonly ["/api/v1/companies/import"];
export declare const getCompanyDataTransferControllerListImportsQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerListImportsQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>>;
export type CompanyDataTransferControllerListImportsQueryError = unknown;
export declare function useCompanyDataTransferControllerListImports<TData = Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerListImports>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerListImports<TData = Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerListImports>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerListImports<TData = Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Download final import results CSV/XLSX report
 */
export type companyDataTransferControllerDownloadReportResponse200 = {
    data: void;
    status: 200;
};
export type companyDataTransferControllerDownloadReportResponseSuccess = (companyDataTransferControllerDownloadReportResponse200) & {
    headers: Headers;
};
export type companyDataTransferControllerDownloadReportResponse = (companyDataTransferControllerDownloadReportResponseSuccess);
export declare const getCompanyDataTransferControllerDownloadReportUrl: (jobId: string) => string;
export declare const companyDataTransferControllerDownloadReport: (jobId: string, options?: RequestInit) => Promise<companyDataTransferControllerDownloadReportResponse>;
export declare const getCompanyDataTransferControllerDownloadReportQueryKey: (jobId?: string) => readonly [`/api/v1/companies/import/${string}/report`];
export declare const getCompanyDataTransferControllerDownloadReportQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerDownloadReportQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>>;
export type CompanyDataTransferControllerDownloadReportQueryError = unknown;
export declare function useCompanyDataTransferControllerDownloadReport<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError = unknown>(jobId: string, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerDownloadReport<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerDownloadReport<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadReport>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get paginated validation issues for import job
 */
export type companyDataTransferControllerGetIssuesResponse200 = {
    data: TransferJobIssuesResponseDto;
    status: 200;
};
export type companyDataTransferControllerGetIssuesResponseSuccess = (companyDataTransferControllerGetIssuesResponse200) & {
    headers: Headers;
};
export type companyDataTransferControllerGetIssuesResponse = (companyDataTransferControllerGetIssuesResponseSuccess);
export declare const getCompanyDataTransferControllerGetIssuesUrl: (jobId: string) => string;
export declare const companyDataTransferControllerGetIssues: (jobId: string, options?: RequestInit) => Promise<companyDataTransferControllerGetIssuesResponse>;
export declare const getCompanyDataTransferControllerGetIssuesQueryKey: (jobId?: string) => readonly [`/api/v1/companies/import/${string}/issues`];
export declare const getCompanyDataTransferControllerGetIssuesQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerGetIssuesQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>>;
export type CompanyDataTransferControllerGetIssuesQueryError = unknown;
export declare function useCompanyDataTransferControllerGetIssues<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError = unknown>(jobId: string, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerGetIssues<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerGetIssues<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get company import job status and progress
 */
export type companyDataTransferControllerGetJobResponse200 = {
    data: DataTransferJobDetailResponseDto;
    status: 200;
};
export type companyDataTransferControllerGetJobResponseSuccess = (companyDataTransferControllerGetJobResponse200) & {
    headers: Headers;
};
export type companyDataTransferControllerGetJobResponse = (companyDataTransferControllerGetJobResponseSuccess);
export declare const getCompanyDataTransferControllerGetJobUrl: (jobId: string) => string;
export declare const companyDataTransferControllerGetJob: (jobId: string, options?: RequestInit) => Promise<companyDataTransferControllerGetJobResponse>;
export declare const getCompanyDataTransferControllerGetJobQueryKey: (jobId?: string) => readonly [`/api/v1/companies/import/${string}`];
export declare const getCompanyDataTransferControllerGetJobQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerGetJobQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>>;
export type CompanyDataTransferControllerGetJobQueryError = unknown;
export declare function useCompanyDataTransferControllerGetJob<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError = unknown>(jobId: string, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerGetJob<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerGetJob<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError = unknown>(jobId: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetJob>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Export companies list with active filters directly to streaming file (rate limit 5/min)
 */
export type companyDataTransferControllerExportResponse200 = {
    data: void;
    status: 200;
};
export type companyDataTransferControllerExportResponseSuccess = (companyDataTransferControllerExportResponse200) & {
    headers: Headers;
};
export type companyDataTransferControllerExportResponse = (companyDataTransferControllerExportResponseSuccess);
export declare const getCompanyDataTransferControllerExportUrl: () => string;
export declare const companyDataTransferControllerExport: (options?: RequestInit) => Promise<companyDataTransferControllerExportResponse>;
export declare const getCompanyDataTransferControllerExportQueryKey: () => readonly ["/api/v1/companies/export"];
export declare const getCompanyDataTransferControllerExportQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerExportQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerExport>>>;
export type CompanyDataTransferControllerExportQueryError = unknown;
export declare function useCompanyDataTransferControllerExport<TData = Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerExport>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerExport<TData = Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerExport>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerExport<TData = Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary List companies with filters and keyset pagination
 */
export type companyControllerListResponse200 = {
    data: ListCompaniesResponseDto;
    status: 200;
};
export type companyControllerListResponseSuccess = (companyControllerListResponse200) & {
    headers: Headers;
};
export type companyControllerListResponse = (companyControllerListResponseSuccess);
export declare const getCompanyControllerListUrl: () => string;
export declare const companyControllerList: (options?: RequestInit) => Promise<companyControllerListResponse>;
export declare const getCompanyControllerListQueryKey: () => readonly ["/api/v1/companies"];
export declare const getCompanyControllerListQueryOptions: <TData = Awaited<ReturnType<typeof companyControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof companyControllerList>>>;
export type CompanyControllerListQueryError = unknown;
export declare function useCompanyControllerList<TData = Awaited<ReturnType<typeof companyControllerList>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, Awaited<ReturnType<typeof companyControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerList<TData = Awaited<ReturnType<typeof companyControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, Awaited<ReturnType<typeof companyControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerList<TData = Awaited<ReturnType<typeof companyControllerList>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create company with channels and contacts
 */
export type companyControllerCreateResponse201 = {
    data: CompanyDetailResponseDto;
    status: 201;
};
export type companyControllerCreateResponseSuccess = (companyControllerCreateResponse201) & {
    headers: Headers;
};
export type companyControllerCreateResponse = (companyControllerCreateResponseSuccess);
export declare const getCompanyControllerCreateUrl: () => string;
export declare const companyControllerCreate: (createCompanyDto: CreateCompanyDto, options?: RequestInit) => Promise<companyControllerCreateResponse>;
export declare const getCompanyControllerCreateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyControllerCreate>>, TError, {
        data: CreateCompanyDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof companyControllerCreate>>, TError, {
    data: CreateCompanyDto;
}, TContext>;
export type CompanyControllerCreateMutationResult = NonNullable<Awaited<ReturnType<typeof companyControllerCreate>>>;
export type CompanyControllerCreateMutationBody = CreateCompanyDto;
export type CompanyControllerCreateMutationError = unknown;
/**
* @summary Create company with channels and contacts
*/
export declare const useCompanyControllerCreate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyControllerCreate>>, TError, {
        data: CreateCompanyDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof companyControllerCreate>>, TError, {
    data: CreateCompanyDto;
}, TContext>;
/**
 * @summary Get active company options for parent picker
 */
export type companyControllerGetOptionsResponse200 = {
    data: CompanyOptionDto[];
    status: 200;
};
export type companyControllerGetOptionsResponseSuccess = (companyControllerGetOptionsResponse200) & {
    headers: Headers;
};
export type companyControllerGetOptionsResponse = (companyControllerGetOptionsResponseSuccess);
export declare const getCompanyControllerGetOptionsUrl: () => string;
export declare const companyControllerGetOptions: (options?: RequestInit) => Promise<companyControllerGetOptionsResponse>;
export declare const getCompanyControllerGetOptionsQueryKey: () => readonly ["/api/v1/companies/options"];
export declare const getCompanyControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof companyControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof companyControllerGetOptions>>>;
export type CompanyControllerGetOptionsQueryError = unknown;
export declare function useCompanyControllerGetOptions<TData = Awaited<ReturnType<typeof companyControllerGetOptions>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, Awaited<ReturnType<typeof companyControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerGetOptions<TData = Awaited<ReturnType<typeof companyControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, Awaited<ReturnType<typeof companyControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerGetOptions<TData = Awaited<ReturnType<typeof companyControllerGetOptions>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Check for potential duplicate companies
 */
export type companyControllerCheckDuplicatesResponse200 = {
    data: CompanyDuplicateMatchDto[];
    status: 200;
};
export type companyControllerCheckDuplicatesResponseSuccess = (companyControllerCheckDuplicatesResponse200) & {
    headers: Headers;
};
export type companyControllerCheckDuplicatesResponse = (companyControllerCheckDuplicatesResponseSuccess);
export declare const getCompanyControllerCheckDuplicatesUrl: () => string;
export declare const companyControllerCheckDuplicates: (options?: RequestInit) => Promise<companyControllerCheckDuplicatesResponse>;
export declare const getCompanyControllerCheckDuplicatesQueryKey: () => readonly ["/api/v1/companies/duplicate-check"];
export declare const getCompanyControllerCheckDuplicatesQueryOptions: <TData = Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyControllerCheckDuplicatesQueryResult = NonNullable<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>>;
export type CompanyControllerCheckDuplicatesQueryError = unknown;
export declare function useCompanyControllerCheckDuplicates<TData = Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, Awaited<ReturnType<typeof companyControllerCheckDuplicates>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerCheckDuplicates<TData = Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, Awaited<ReturnType<typeof companyControllerCheckDuplicates>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerCheckDuplicates<TData = Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get company detail by ID
 */
export type companyControllerGetByIdResponse200 = {
    data: CompanyDetailResponseDto;
    status: 200;
};
export type companyControllerGetByIdResponseSuccess = (companyControllerGetByIdResponse200) & {
    headers: Headers;
};
export type companyControllerGetByIdResponse = (companyControllerGetByIdResponseSuccess);
export declare const getCompanyControllerGetByIdUrl: (id: number) => string;
export declare const companyControllerGetById: (id: number, options?: RequestInit) => Promise<companyControllerGetByIdResponse>;
export declare const getCompanyControllerGetByIdQueryKey: (id?: number) => readonly ["/api/v1/companies/undefined" | `/api/v1/companies/${number}`];
export declare const getCompanyControllerGetByIdQueryOptions: <TData = Awaited<ReturnType<typeof companyControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetById>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyControllerGetByIdQueryResult = NonNullable<Awaited<ReturnType<typeof companyControllerGetById>>>;
export type CompanyControllerGetByIdQueryError = unknown;
export declare function useCompanyControllerGetById<TData = Awaited<ReturnType<typeof companyControllerGetById>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetById>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerGetById>>, TError, Awaited<ReturnType<typeof companyControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerGetById<TData = Awaited<ReturnType<typeof companyControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetById>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerGetById>>, TError, Awaited<ReturnType<typeof companyControllerGetById>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerGetById<TData = Awaited<ReturnType<typeof companyControllerGetById>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetById>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update company with channels and contacts diff
 */
export type companyControllerUpdateResponse200 = {
    data: CompanyDetailResponseDto;
    status: 200;
};
export type companyControllerUpdateResponseSuccess = (companyControllerUpdateResponse200) & {
    headers: Headers;
};
export type companyControllerUpdateResponse = (companyControllerUpdateResponseSuccess);
export declare const getCompanyControllerUpdateUrl: (id: number) => string;
export declare const companyControllerUpdate: (id: number, updateCompanyDto: UpdateCompanyDto, options?: RequestInit) => Promise<companyControllerUpdateResponse>;
export declare const getCompanyControllerUpdateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyControllerUpdate>>, TError, {
        id: number;
        data: UpdateCompanyDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof companyControllerUpdate>>, TError, {
    id: number;
    data: UpdateCompanyDto;
}, TContext>;
export type CompanyControllerUpdateMutationResult = NonNullable<Awaited<ReturnType<typeof companyControllerUpdate>>>;
export type CompanyControllerUpdateMutationBody = UpdateCompanyDto;
export type CompanyControllerUpdateMutationError = unknown;
/**
* @summary Update company with channels and contacts diff
*/
export declare const useCompanyControllerUpdate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyControllerUpdate>>, TError, {
        id: number;
        data: UpdateCompanyDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof companyControllerUpdate>>, TError, {
    id: number;
    data: UpdateCompanyDto;
}, TContext>;
/**
 * @summary Soft delete company, channels and contacts links
 */
export type companyControllerDeleteResponse204 = {
    data: void;
    status: 204;
};
export type companyControllerDeleteResponseSuccess = (companyControllerDeleteResponse204) & {
    headers: Headers;
};
export type companyControllerDeleteResponse = (companyControllerDeleteResponseSuccess);
export declare const getCompanyControllerDeleteUrl: (id: number) => string;
export declare const companyControllerDelete: (id: number, options?: RequestInit) => Promise<companyControllerDeleteResponse>;
export declare const getCompanyControllerDeleteMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof companyControllerDelete>>, TError, {
    id: number;
}, TContext>;
export type CompanyControllerDeleteMutationResult = NonNullable<Awaited<ReturnType<typeof companyControllerDelete>>>;
export type CompanyControllerDeleteMutationError = unknown;
/**
* @summary Soft delete company, channels and contacts links
*/
export declare const useCompanyControllerDelete: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyControllerDelete>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof companyControllerDelete>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Lookup persons by email or mobile to link existing person
 */
export type personControllerLookupResponse200 = {
    data: PersonLookupMatchDto[];
    status: 200;
};
export type personControllerLookupResponseSuccess = (personControllerLookupResponse200) & {
    headers: Headers;
};
export type personControllerLookupResponse = (personControllerLookupResponseSuccess);
export declare const getPersonControllerLookupUrl: () => string;
export declare const personControllerLookup: (options?: RequestInit) => Promise<personControllerLookupResponse>;
export declare const getPersonControllerLookupQueryKey: () => readonly ["/api/v1/persons/lookup"];
export declare const getPersonControllerLookupQueryOptions: <TData = Awaited<ReturnType<typeof personControllerLookup>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type PersonControllerLookupQueryResult = NonNullable<Awaited<ReturnType<typeof personControllerLookup>>>;
export type PersonControllerLookupQueryError = unknown;
export declare function usePersonControllerLookup<TData = Awaited<ReturnType<typeof personControllerLookup>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, Awaited<ReturnType<typeof personControllerLookup>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function usePersonControllerLookup<TData = Awaited<ReturnType<typeof personControllerLookup>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, Awaited<ReturnType<typeof personControllerLookup>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function usePersonControllerLookup<TData = Awaited<ReturnType<typeof personControllerLookup>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export {};
