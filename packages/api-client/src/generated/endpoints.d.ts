import type { DataTag, DefinedInitialDataOptions, DefinedUseQueryResult, QueryClient, QueryKey, UndefinedInitialDataOptions, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AddBugCommentDto, AdminUpsertDayDto, ApproveRegularizationDto, AssignableEmployeeDto, AttendanceControllerGetDashboardParams, AttendanceControllerGetMeParams, AttendanceControllerGetReportParams, AttendanceControllerGetTeamParams, AttendanceControllerListRegularizationsParams, BulkApproveRegularizationDto, CalendarControllerGetEventsParams, CalendarControllerGetHolidaysParams, CalendarControllerGetMonthTasksParams, CalendarControllerGetSummaryParams, CalendarEventResponseDto, ChangePasswordDto, CompanyControllerCheckDuplicatesParams, CompanyControllerGetOptionsParams, CompanyControllerListParams, CompanyDataTransferControllerDownloadTemplateParams, CompanyDataTransferControllerExportParams, CompanyDataTransferControllerGetIssuesParams, CompanyDataTransferControllerListImportsParams, CompanyDataTransferControllerPreviewBody, CompanyDetailResponseDto, CompanyDuplicateMatchDto, CompanyImportConfirmDto, CompanyImportConfirmResponseDto, CompanyImportPreviewResponseDto, CompanyOptionDto, CreateBugDto, CreateCalendarEventDto, CreateCompanyDto, CreateCorrectionDto, CreateCustomerTypeDto, CreateDepartmentDto, CreateDiscussionDto, CreateEmployeeDto, CreateIndustryDto, CreateLookupDto, CreateProjectDto, CreateProjectTaskDto, CreateRegularizationDto, CreateRoleDto, CreateSprintDto, CreateTaskDto, CustomerTypeControllerListParams, CustomerTypeItemDto, CustomerTypeOptionDto, DashboardResponseDto, DataTransferJobDetailResponseDto, DayDetailDto, DeactivateEmployeeDto, DeactivateWarningResponseDto, DepartmentControllerListParams, DepartmentListResponseDto, DepartmentOptionDto, DepartmentResponseDto, EmployeeControllerGetOptionsParams, EmployeeControllerListParams, EmployeeControllerUploadPhotoBody, EmployeeHistoryItemDto, EmployeeListResponseDto, EmployeeOptionDto, EmployeeResponseDto, FilesControllerGetProfilePhotoParams, ForgotPasswordDto, ForgotPasswordResponseDto, IndustryControllerGetOptionsParams, IndustryControllerListParams, IndustryDetailResponseDto, IndustryOptionDto, ListCompaniesResponseDto, ListCustomerTypesResponseDto, ListIndustriesResponseDto, LoginDto, LoginResponseDto, LookupControllerCreateParams, LookupControllerGetOptionsParams, LookupControllerListAllParams, LookupOptionDto, MarkAllReadResponseDto, MarkReadResponseDto, MasterLookupItemDto, MeResponseDto, MonthBlockDto, MoveTaskStageDto, MyTasksControllerGetBoardParams, NotificationResponseDto, NotificationsControllerGetNotificationsParams, PendingReviewCountDto, PersonControllerLookupParams, PersonLookupMatchDto, ProjectsControllerGetProjectTasksParams, ProjectsControllerGetProjectsParams, RefreshResponseDto, RejectCorrectionDto, RejectRegularizationDto, ResendOtpDto, ResetPasswordDto, RespondRsvpDto, RoleControllerGetOptionsParams, RoleControllerListParams, RoleListResponseDto, RoleOptionDto, RoleResponseDto, StartBreakDto, TaskBoardResultDto, TaskDetailDto, TaskSummaryDto, TasksControllerGetBoardParams, TodayAttendanceBlockDto, TrackWorkSessionDto, TransferJobIssuesResponseDto, TransferJobListResponseDto, UnreadCountResponseDto, UnscheduledTaskDto, UpdateBugStatusDto, UpdateCalendarEventDto, UpdateCompanyDto, UpdateCustomerTypeDto, UpdateDepartmentDto, UpdateEmployeeDto, UpdateIndustryDto, UpdateLookupDto, UpdateProjectDto, UpdateProjectStatusDto, UpdateRoleDto, UpdateSprintDto, UpdateTaskDto, VerifyLoginDto, VerifyLoginResponseDto } from './model';
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
 * @summary Login directly with email and password
 */
export type authControllerLoginResponse200 = {
    data: VerifyLoginResponseDto;
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
export declare const authControllerLogin: (loginDto: LoginDto, options?: RequestInit) => Promise<authControllerLoginResponse>;
export declare const getAuthControllerLoginMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerLogin>>, TError, {
        data: LoginDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerLogin>>, TError, {
    data: LoginDto;
}, TContext>;
export type AuthControllerLoginMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerLogin>>>;
export type AuthControllerLoginMutationBody = LoginDto;
export type AuthControllerLoginMutationError = void;
/**
* @summary Login directly with email and password
*/
export declare const useAuthControllerLogin: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerLogin>>, TError, {
        data: LoginDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerLogin>>, TError, {
    data: LoginDto;
}, TContext>;
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
export declare const authControllerVerifyLogin: (verifyLoginDto: VerifyLoginDto, options?: RequestInit) => Promise<authControllerVerifyLoginResponse>;
export declare const getAuthControllerVerifyLoginMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerVerifyLogin>>, TError, {
        data: VerifyLoginDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerVerifyLogin>>, TError, {
    data: VerifyLoginDto;
}, TContext>;
export type AuthControllerVerifyLoginMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerVerifyLogin>>>;
export type AuthControllerVerifyLoginMutationBody = VerifyLoginDto;
export type AuthControllerVerifyLoginMutationError = void;
/**
* @summary Verify email OTP and establish session
*/
export declare const useAuthControllerVerifyLogin: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerVerifyLogin>>, TError, {
        data: VerifyLoginDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerVerifyLogin>>, TError, {
    data: VerifyLoginDto;
}, TContext>;
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
export declare const authControllerResendOtp: (resendOtpDto: ResendOtpDto, options?: RequestInit) => Promise<authControllerResendOtpResponse>;
export declare const getAuthControllerResendOtpMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerResendOtp>>, TError, {
        data: ResendOtpDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerResendOtp>>, TError, {
    data: ResendOtpDto;
}, TContext>;
export type AuthControllerResendOtpMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerResendOtp>>>;
export type AuthControllerResendOtpMutationBody = ResendOtpDto;
export type AuthControllerResendOtpMutationError = void;
/**
* @summary Resend email OTP for open challenge adhering to cooldown
*/
export declare const useAuthControllerResendOtp: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerResendOtp>>, TError, {
        data: ResendOtpDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerResendOtp>>, TError, {
    data: ResendOtpDto;
}, TContext>;
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
export declare const authControllerChangePassword: (changePasswordDto: ChangePasswordDto, options?: RequestInit) => Promise<authControllerChangePasswordResponse>;
export declare const getAuthControllerChangePasswordMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerChangePassword>>, TError, {
        data: ChangePasswordDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerChangePassword>>, TError, {
    data: ChangePasswordDto;
}, TContext>;
export type AuthControllerChangePasswordMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerChangePassword>>>;
export type AuthControllerChangePasswordMutationBody = ChangePasswordDto;
export type AuthControllerChangePasswordMutationError = unknown;
/**
* @summary Change password and revoke all other sessions
*/
export declare const useAuthControllerChangePassword: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerChangePassword>>, TError, {
        data: ChangePasswordDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerChangePassword>>, TError, {
    data: ChangePasswordDto;
}, TContext>;
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
export declare const authControllerForgotPassword: (forgotPasswordDto: ForgotPasswordDto, options?: RequestInit) => Promise<authControllerForgotPasswordResponse>;
export declare const getAuthControllerForgotPasswordMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerForgotPassword>>, TError, {
        data: ForgotPasswordDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerForgotPassword>>, TError, {
    data: ForgotPasswordDto;
}, TContext>;
export type AuthControllerForgotPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerForgotPassword>>>;
export type AuthControllerForgotPasswordMutationBody = ForgotPasswordDto;
export type AuthControllerForgotPasswordMutationError = unknown;
/**
* @summary Request password reset code (always returns 202)
*/
export declare const useAuthControllerForgotPassword: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerForgotPassword>>, TError, {
        data: ForgotPasswordDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerForgotPassword>>, TError, {
    data: ForgotPasswordDto;
}, TContext>;
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
export declare const authControllerResetPassword: (resetPasswordDto: ResetPasswordDto, options?: RequestInit) => Promise<authControllerResetPasswordResponse>;
export declare const getAuthControllerResetPasswordMutationOptions: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerResetPassword>>, TError, {
        data: ResetPasswordDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authControllerResetPassword>>, TError, {
    data: ResetPasswordDto;
}, TContext>;
export type AuthControllerResetPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof authControllerResetPassword>>>;
export type AuthControllerResetPasswordMutationBody = ResetPasswordDto;
export type AuthControllerResetPasswordMutationError = void;
/**
* @summary Reset password using email OTP and revoke all sessions
*/
export declare const useAuthControllerResetPassword: <TError = void, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authControllerResetPassword>>, TError, {
        data: ResetPasswordDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof authControllerResetPassword>>, TError, {
    data: ResetPasswordDto;
}, TContext>;
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
export declare const getFilesControllerGetProfilePhotoUrl: (key: string, params: FilesControllerGetProfilePhotoParams) => string;
export declare const filesControllerGetProfilePhoto: (key: string, params: FilesControllerGetProfilePhotoParams, options?: RequestInit) => Promise<filesControllerGetProfilePhotoResponse>;
export declare const getFilesControllerGetProfilePhotoQueryKey: (key?: string, params?: FilesControllerGetProfilePhotoParams) => readonly [`/api/v1/files/profile-photos/${string}`, ...FilesControllerGetProfilePhotoParams[]];
export declare const getFilesControllerGetProfilePhotoQueryOptions: <TData = Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError = void>(key: string, params: FilesControllerGetProfilePhotoParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type FilesControllerGetProfilePhotoQueryResult = NonNullable<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>>;
export type FilesControllerGetProfilePhotoQueryError = void;
export declare function useFilesControllerGetProfilePhoto<TData = Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError = void>(key: string, params: FilesControllerGetProfilePhotoParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useFilesControllerGetProfilePhoto<TData = Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError = void>(key: string, params: FilesControllerGetProfilePhotoParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError, Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useFilesControllerGetProfilePhoto<TData = Awaited<ReturnType<typeof filesControllerGetProfilePhoto>>, TError = void>(key: string, params: FilesControllerGetProfilePhotoParams, options?: {
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
export declare const getDepartmentControllerListUrl: (params?: DepartmentControllerListParams) => string;
export declare const departmentControllerList: (params?: DepartmentControllerListParams, options?: RequestInit) => Promise<departmentControllerListResponse>;
export declare const getDepartmentControllerListQueryKey: (params?: DepartmentControllerListParams) => readonly ["/api/v1/departments", ...DepartmentControllerListParams[]];
export declare const getDepartmentControllerListQueryOptions: <TData = Awaited<ReturnType<typeof departmentControllerList>>, TError = unknown>(params?: DepartmentControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type DepartmentControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof departmentControllerList>>>;
export type DepartmentControllerListQueryError = unknown;
export declare function useDepartmentControllerList<TData = Awaited<ReturnType<typeof departmentControllerList>>, TError = unknown>(params: undefined | DepartmentControllerListParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, Awaited<ReturnType<typeof departmentControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useDepartmentControllerList<TData = Awaited<ReturnType<typeof departmentControllerList>>, TError = unknown>(params?: DepartmentControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof departmentControllerList>>, TError, Awaited<ReturnType<typeof departmentControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useDepartmentControllerList<TData = Awaited<ReturnType<typeof departmentControllerList>>, TError = unknown>(params?: DepartmentControllerListParams, options?: {
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
export declare const getRoleControllerListUrl: (params?: RoleControllerListParams) => string;
export declare const roleControllerList: (params?: RoleControllerListParams, options?: RequestInit) => Promise<roleControllerListResponse>;
export declare const getRoleControllerListQueryKey: (params?: RoleControllerListParams) => readonly ["/api/v1/roles", ...RoleControllerListParams[]];
export declare const getRoleControllerListQueryOptions: <TData = Awaited<ReturnType<typeof roleControllerList>>, TError = unknown>(params?: RoleControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type RoleControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof roleControllerList>>>;
export type RoleControllerListQueryError = unknown;
export declare function useRoleControllerList<TData = Awaited<ReturnType<typeof roleControllerList>>, TError = unknown>(params: undefined | RoleControllerListParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, Awaited<ReturnType<typeof roleControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useRoleControllerList<TData = Awaited<ReturnType<typeof roleControllerList>>, TError = unknown>(params?: RoleControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof roleControllerList>>, TError, Awaited<ReturnType<typeof roleControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useRoleControllerList<TData = Awaited<ReturnType<typeof roleControllerList>>, TError = unknown>(params?: RoleControllerListParams, options?: {
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
export declare const getEmployeeControllerListUrl: (params?: EmployeeControllerListParams) => string;
export declare const employeeControllerList: (params?: EmployeeControllerListParams, options?: RequestInit) => Promise<employeeControllerListResponse>;
export declare const getEmployeeControllerListQueryKey: (params?: EmployeeControllerListParams) => readonly ["/api/v1/employees", ...EmployeeControllerListParams[]];
export declare const getEmployeeControllerListQueryOptions: <TData = Awaited<ReturnType<typeof employeeControllerList>>, TError = unknown>(params?: EmployeeControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type EmployeeControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof employeeControllerList>>>;
export type EmployeeControllerListQueryError = unknown;
export declare function useEmployeeControllerList<TData = Awaited<ReturnType<typeof employeeControllerList>>, TError = unknown>(params: undefined | EmployeeControllerListParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, Awaited<ReturnType<typeof employeeControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerList<TData = Awaited<ReturnType<typeof employeeControllerList>>, TError = unknown>(params?: EmployeeControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerList>>, TError, Awaited<ReturnType<typeof employeeControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerList<TData = Awaited<ReturnType<typeof employeeControllerList>>, TError = unknown>(params?: EmployeeControllerListParams, options?: {
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
 * @summary Get direct reports warning before deactivating an employee
 */
export type employeeControllerGetDeactivateWarningResponse200 = {
    data: DeactivateWarningResponseDto;
    status: 200;
};
export type employeeControllerGetDeactivateWarningResponseSuccess = (employeeControllerGetDeactivateWarningResponse200) & {
    headers: Headers;
};
export type employeeControllerGetDeactivateWarningResponse = (employeeControllerGetDeactivateWarningResponseSuccess);
export declare const getEmployeeControllerGetDeactivateWarningUrl: (id: number) => string;
export declare const employeeControllerGetDeactivateWarning: (id: number, options?: RequestInit) => Promise<employeeControllerGetDeactivateWarningResponse>;
export declare const getEmployeeControllerGetDeactivateWarningQueryKey: (id?: number) => readonly ["/api/v1/employees/undefined/deactivate-warning" | `/api/v1/employees/${number}/deactivate-warning`];
export declare const getEmployeeControllerGetDeactivateWarningQueryOptions: <TData = Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type EmployeeControllerGetDeactivateWarningQueryResult = NonNullable<Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>>;
export type EmployeeControllerGetDeactivateWarningQueryError = unknown;
export declare function useEmployeeControllerGetDeactivateWarning<TData = Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError, Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerGetDeactivateWarning<TData = Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError, Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerGetDeactivateWarning<TData = Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetDeactivateWarning>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Deactivate an employee (with reason, termination date, and notes)
 */
export type employeeControllerDeactivateResponse200 = {
    data: EmployeeResponseDto;
    status: 200;
};
export type employeeControllerDeactivateResponseSuccess = (employeeControllerDeactivateResponse200) & {
    headers: Headers;
};
export type employeeControllerDeactivateResponse = (employeeControllerDeactivateResponseSuccess);
export declare const getEmployeeControllerDeactivateUrl: (id: number) => string;
export declare const employeeControllerDeactivate: (id: number, deactivateEmployeeDto: DeactivateEmployeeDto, options?: RequestInit) => Promise<employeeControllerDeactivateResponse>;
export declare const getEmployeeControllerDeactivateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerDeactivate>>, TError, {
        id: number;
        data: DeactivateEmployeeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof employeeControllerDeactivate>>, TError, {
    id: number;
    data: DeactivateEmployeeDto;
}, TContext>;
export type EmployeeControllerDeactivateMutationResult = NonNullable<Awaited<ReturnType<typeof employeeControllerDeactivate>>>;
export type EmployeeControllerDeactivateMutationBody = DeactivateEmployeeDto;
export type EmployeeControllerDeactivateMutationError = unknown;
/**
* @summary Deactivate an employee (with reason, termination date, and notes)
*/
export declare const useEmployeeControllerDeactivate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof employeeControllerDeactivate>>, TError, {
        id: number;
        data: DeactivateEmployeeDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof employeeControllerDeactivate>>, TError, {
    id: number;
    data: DeactivateEmployeeDto;
}, TContext>;
/**
 * @summary Get employee milestone and growth timeline history
 */
export type employeeControllerGetHistoryResponse200 = {
    data: EmployeeHistoryItemDto[];
    status: 200;
};
export type employeeControllerGetHistoryResponseSuccess = (employeeControllerGetHistoryResponse200) & {
    headers: Headers;
};
export type employeeControllerGetHistoryResponse = (employeeControllerGetHistoryResponseSuccess);
export declare const getEmployeeControllerGetHistoryUrl: (id: number) => string;
export declare const employeeControllerGetHistory: (id: number, options?: RequestInit) => Promise<employeeControllerGetHistoryResponse>;
export declare const getEmployeeControllerGetHistoryQueryKey: (id?: number) => readonly ["/api/v1/employees/undefined/history" | `/api/v1/employees/${number}/history`];
export declare const getEmployeeControllerGetHistoryQueryOptions: <TData = Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type EmployeeControllerGetHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof employeeControllerGetHistory>>>;
export type EmployeeControllerGetHistoryQueryError = unknown;
export declare function useEmployeeControllerGetHistory<TData = Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError, Awaited<ReturnType<typeof employeeControllerGetHistory>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerGetHistory<TData = Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError, Awaited<ReturnType<typeof employeeControllerGetHistory>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useEmployeeControllerGetHistory<TData = Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof employeeControllerGetHistory>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
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
export declare const getIndustryControllerListUrl: (params?: IndustryControllerListParams) => string;
export declare const industryControllerList: (params?: IndustryControllerListParams, options?: RequestInit) => Promise<industryControllerListResponse>;
export declare const getIndustryControllerListQueryKey: (params?: IndustryControllerListParams) => readonly ["/api/v1/industries", ...IndustryControllerListParams[]];
export declare const getIndustryControllerListQueryOptions: <TData = Awaited<ReturnType<typeof industryControllerList>>, TError = unknown>(params?: IndustryControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type IndustryControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof industryControllerList>>>;
export type IndustryControllerListQueryError = unknown;
export declare function useIndustryControllerList<TData = Awaited<ReturnType<typeof industryControllerList>>, TError = unknown>(params: undefined | IndustryControllerListParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, Awaited<ReturnType<typeof industryControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerList<TData = Awaited<ReturnType<typeof industryControllerList>>, TError = unknown>(params?: IndustryControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerList>>, TError, Awaited<ReturnType<typeof industryControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerList<TData = Awaited<ReturnType<typeof industryControllerList>>, TError = unknown>(params?: IndustryControllerListParams, options?: {
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
export declare const getIndustryControllerGetOptionsUrl: (params?: IndustryControllerGetOptionsParams) => string;
export declare const industryControllerGetOptions: (params?: IndustryControllerGetOptionsParams, options?: RequestInit) => Promise<industryControllerGetOptionsResponse>;
export declare const getIndustryControllerGetOptionsQueryKey: (params?: IndustryControllerGetOptionsParams) => readonly ["/api/v1/industries/options", ...IndustryControllerGetOptionsParams[]];
export declare const getIndustryControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof industryControllerGetOptions>>, TError = unknown>(params?: IndustryControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type IndustryControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof industryControllerGetOptions>>>;
export type IndustryControllerGetOptionsQueryError = unknown;
export declare function useIndustryControllerGetOptions<TData = Awaited<ReturnType<typeof industryControllerGetOptions>>, TError = unknown>(params: undefined | IndustryControllerGetOptionsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, Awaited<ReturnType<typeof industryControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerGetOptions<TData = Awaited<ReturnType<typeof industryControllerGetOptions>>, TError = unknown>(params?: IndustryControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof industryControllerGetOptions>>, TError, Awaited<ReturnType<typeof industryControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useIndustryControllerGetOptions<TData = Awaited<ReturnType<typeof industryControllerGetOptions>>, TError = unknown>(params?: IndustryControllerGetOptionsParams, options?: {
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
export declare const getCustomerTypeControllerListUrl: (params?: CustomerTypeControllerListParams) => string;
export declare const customerTypeControllerList: (params?: CustomerTypeControllerListParams, options?: RequestInit) => Promise<customerTypeControllerListResponse>;
export declare const getCustomerTypeControllerListQueryKey: (params?: CustomerTypeControllerListParams) => readonly ["/api/v1/customer-types", ...CustomerTypeControllerListParams[]];
export declare const getCustomerTypeControllerListQueryOptions: <TData = Awaited<ReturnType<typeof customerTypeControllerList>>, TError = unknown>(params?: CustomerTypeControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CustomerTypeControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof customerTypeControllerList>>>;
export type CustomerTypeControllerListQueryError = unknown;
export declare function useCustomerTypeControllerList<TData = Awaited<ReturnType<typeof customerTypeControllerList>>, TError = unknown>(params: undefined | CustomerTypeControllerListParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, Awaited<ReturnType<typeof customerTypeControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCustomerTypeControllerList<TData = Awaited<ReturnType<typeof customerTypeControllerList>>, TError = unknown>(params?: CustomerTypeControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof customerTypeControllerList>>, TError, Awaited<ReturnType<typeof customerTypeControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCustomerTypeControllerList<TData = Awaited<ReturnType<typeof customerTypeControllerList>>, TError = unknown>(params?: CustomerTypeControllerListParams, options?: {
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
 * @summary Get active lookup options by type (for dropdowns)
 */
export type lookupControllerGetOptionsResponse200 = {
    data: LookupOptionDto[];
    status: 200;
};
export type lookupControllerGetOptionsResponseSuccess = (lookupControllerGetOptionsResponse200) & {
    headers: Headers;
};
export type lookupControllerGetOptionsResponse = (lookupControllerGetOptionsResponseSuccess);
export declare const getLookupControllerGetOptionsUrl: (params: LookupControllerGetOptionsParams) => string;
export declare const lookupControllerGetOptions: (params: LookupControllerGetOptionsParams, options?: RequestInit) => Promise<lookupControllerGetOptionsResponse>;
export declare const getLookupControllerGetOptionsQueryKey: (params?: LookupControllerGetOptionsParams) => readonly ["/api/v1/lookups/options", ...LookupControllerGetOptionsParams[]];
export declare const getLookupControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError = unknown>(params: LookupControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type LookupControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof lookupControllerGetOptions>>>;
export type LookupControllerGetOptionsQueryError = unknown;
export declare function useLookupControllerGetOptions<TData = Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError = unknown>(params: LookupControllerGetOptionsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, Awaited<ReturnType<typeof lookupControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useLookupControllerGetOptions<TData = Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError = unknown>(params: LookupControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, Awaited<ReturnType<typeof lookupControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useLookupControllerGetOptions<TData = Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError = unknown>(params: LookupControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary List all lookup items (including inactive) by type
 */
export type lookupControllerListAllResponse200 = {
    data: MasterLookupItemDto[];
    status: 200;
};
export type lookupControllerListAllResponseSuccess = (lookupControllerListAllResponse200) & {
    headers: Headers;
};
export type lookupControllerListAllResponse = (lookupControllerListAllResponseSuccess);
export declare const getLookupControllerListAllUrl: (params: LookupControllerListAllParams) => string;
export declare const lookupControllerListAll: (params: LookupControllerListAllParams, options?: RequestInit) => Promise<lookupControllerListAllResponse>;
export declare const getLookupControllerListAllQueryKey: (params?: LookupControllerListAllParams) => readonly ["/api/v1/lookups", ...LookupControllerListAllParams[]];
export declare const getLookupControllerListAllQueryOptions: <TData = Awaited<ReturnType<typeof lookupControllerListAll>>, TError = unknown>(params: LookupControllerListAllParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerListAll>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof lookupControllerListAll>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type LookupControllerListAllQueryResult = NonNullable<Awaited<ReturnType<typeof lookupControllerListAll>>>;
export type LookupControllerListAllQueryError = unknown;
export declare function useLookupControllerListAll<TData = Awaited<ReturnType<typeof lookupControllerListAll>>, TError = unknown>(params: LookupControllerListAllParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerListAll>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof lookupControllerListAll>>, TError, Awaited<ReturnType<typeof lookupControllerListAll>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useLookupControllerListAll<TData = Awaited<ReturnType<typeof lookupControllerListAll>>, TError = unknown>(params: LookupControllerListAllParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerListAll>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof lookupControllerListAll>>, TError, Awaited<ReturnType<typeof lookupControllerListAll>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useLookupControllerListAll<TData = Awaited<ReturnType<typeof lookupControllerListAll>>, TError = unknown>(params: LookupControllerListAllParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof lookupControllerListAll>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a new lookup item
 */
export type lookupControllerCreateResponse201 = {
    data: MasterLookupItemDto;
    status: 201;
};
export type lookupControllerCreateResponseSuccess = (lookupControllerCreateResponse201) & {
    headers: Headers;
};
export type lookupControllerCreateResponse = (lookupControllerCreateResponseSuccess);
export declare const getLookupControllerCreateUrl: (params: LookupControllerCreateParams) => string;
export declare const lookupControllerCreate: (createLookupDto: CreateLookupDto, params: LookupControllerCreateParams, options?: RequestInit) => Promise<lookupControllerCreateResponse>;
export declare const getLookupControllerCreateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof lookupControllerCreate>>, TError, {
        data: CreateLookupDto;
        params: LookupControllerCreateParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof lookupControllerCreate>>, TError, {
    data: CreateLookupDto;
    params: LookupControllerCreateParams;
}, TContext>;
export type LookupControllerCreateMutationResult = NonNullable<Awaited<ReturnType<typeof lookupControllerCreate>>>;
export type LookupControllerCreateMutationBody = CreateLookupDto;
export type LookupControllerCreateMutationError = unknown;
/**
* @summary Create a new lookup item
*/
export declare const useLookupControllerCreate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof lookupControllerCreate>>, TError, {
        data: CreateLookupDto;
        params: LookupControllerCreateParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof lookupControllerCreate>>, TError, {
    data: CreateLookupDto;
    params: LookupControllerCreateParams;
}, TContext>;
/**
 * @summary Update a lookup item
 */
export type lookupControllerUpdateResponse200 = {
    data: MasterLookupItemDto;
    status: 200;
};
export type lookupControllerUpdateResponseSuccess = (lookupControllerUpdateResponse200) & {
    headers: Headers;
};
export type lookupControllerUpdateResponse = (lookupControllerUpdateResponseSuccess);
export declare const getLookupControllerUpdateUrl: (id: number) => string;
export declare const lookupControllerUpdate: (id: number, updateLookupDto: UpdateLookupDto, options?: RequestInit) => Promise<lookupControllerUpdateResponse>;
export declare const getLookupControllerUpdateMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof lookupControllerUpdate>>, TError, {
        id: number;
        data: UpdateLookupDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof lookupControllerUpdate>>, TError, {
    id: number;
    data: UpdateLookupDto;
}, TContext>;
export type LookupControllerUpdateMutationResult = NonNullable<Awaited<ReturnType<typeof lookupControllerUpdate>>>;
export type LookupControllerUpdateMutationBody = UpdateLookupDto;
export type LookupControllerUpdateMutationError = unknown;
/**
* @summary Update a lookup item
*/
export declare const useLookupControllerUpdate: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof lookupControllerUpdate>>, TError, {
        id: number;
        data: UpdateLookupDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof lookupControllerUpdate>>, TError, {
    id: number;
    data: UpdateLookupDto;
}, TContext>;
/**
 * @summary Delete (soft delete) a lookup item
 */
export type lookupControllerRemoveResponse204 = {
    data: void;
    status: 204;
};
export type lookupControllerRemoveResponseSuccess = (lookupControllerRemoveResponse204) & {
    headers: Headers;
};
export type lookupControllerRemoveResponse = (lookupControllerRemoveResponseSuccess);
export declare const getLookupControllerRemoveUrl: (id: number) => string;
export declare const lookupControllerRemove: (id: number, options?: RequestInit) => Promise<lookupControllerRemoveResponse>;
export declare const getLookupControllerRemoveMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof lookupControllerRemove>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof lookupControllerRemove>>, TError, {
    id: number;
}, TContext>;
export type LookupControllerRemoveMutationResult = NonNullable<Awaited<ReturnType<typeof lookupControllerRemove>>>;
export type LookupControllerRemoveMutationError = unknown;
/**
* @summary Delete (soft delete) a lookup item
*/
export declare const useLookupControllerRemove: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof lookupControllerRemove>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof lookupControllerRemove>>, TError, {
    id: number;
}, TContext>;
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
export declare const getCompanyDataTransferControllerDownloadTemplateUrl: (params: CompanyDataTransferControllerDownloadTemplateParams) => string;
export declare const companyDataTransferControllerDownloadTemplate: (params: CompanyDataTransferControllerDownloadTemplateParams, options?: RequestInit) => Promise<companyDataTransferControllerDownloadTemplateResponse>;
export declare const getCompanyDataTransferControllerDownloadTemplateQueryKey: (params?: CompanyDataTransferControllerDownloadTemplateParams) => readonly ["/api/v1/companies/import/template", ...CompanyDataTransferControllerDownloadTemplateParams[]];
export declare const getCompanyDataTransferControllerDownloadTemplateQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError = unknown>(params: CompanyDataTransferControllerDownloadTemplateParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerDownloadTemplateQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>>;
export type CompanyDataTransferControllerDownloadTemplateQueryError = unknown;
export declare function useCompanyDataTransferControllerDownloadTemplate<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError = unknown>(params: CompanyDataTransferControllerDownloadTemplateParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerDownloadTemplate<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError = unknown>(params: CompanyDataTransferControllerDownloadTemplateParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerDownloadTemplate<TData = Awaited<ReturnType<typeof companyDataTransferControllerDownloadTemplate>>, TError = unknown>(params: CompanyDataTransferControllerDownloadTemplateParams, options?: {
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
export declare const companyDataTransferControllerConfirm: (jobId: string, companyImportConfirmDto: CompanyImportConfirmDto, options?: RequestInit) => Promise<companyDataTransferControllerConfirmResponse>;
export declare const getCompanyDataTransferControllerConfirmMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>, TError, {
        jobId: string;
        data: CompanyImportConfirmDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>, TError, {
    jobId: string;
    data: CompanyImportConfirmDto;
}, TContext>;
export type CompanyDataTransferControllerConfirmMutationResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>>;
export type CompanyDataTransferControllerConfirmMutationBody = CompanyImportConfirmDto;
export type CompanyDataTransferControllerConfirmMutationError = unknown;
/**
* @summary Confirm import preview and enqueue background processing (rate limit 5/min)
*/
export declare const useCompanyDataTransferControllerConfirm: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>, TError, {
        jobId: string;
        data: CompanyImportConfirmDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof companyDataTransferControllerConfirm>>, TError, {
    jobId: string;
    data: CompanyImportConfirmDto;
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
export declare const getCompanyDataTransferControllerListImportsUrl: (params?: CompanyDataTransferControllerListImportsParams) => string;
export declare const companyDataTransferControllerListImports: (params?: CompanyDataTransferControllerListImportsParams, options?: RequestInit) => Promise<companyDataTransferControllerListImportsResponse>;
export declare const getCompanyDataTransferControllerListImportsQueryKey: (params?: CompanyDataTransferControllerListImportsParams) => readonly ["/api/v1/companies/import", ...CompanyDataTransferControllerListImportsParams[]];
export declare const getCompanyDataTransferControllerListImportsQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError = unknown>(params?: CompanyDataTransferControllerListImportsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerListImportsQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>>;
export type CompanyDataTransferControllerListImportsQueryError = unknown;
export declare function useCompanyDataTransferControllerListImports<TData = Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError = unknown>(params: undefined | CompanyDataTransferControllerListImportsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerListImports>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerListImports<TData = Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError = unknown>(params?: CompanyDataTransferControllerListImportsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerListImports>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerListImports<TData = Awaited<ReturnType<typeof companyDataTransferControllerListImports>>, TError = unknown>(params?: CompanyDataTransferControllerListImportsParams, options?: {
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
export declare const getCompanyDataTransferControllerGetIssuesUrl: (jobId: string, params: CompanyDataTransferControllerGetIssuesParams) => string;
export declare const companyDataTransferControllerGetIssues: (jobId: string, params: CompanyDataTransferControllerGetIssuesParams, options?: RequestInit) => Promise<companyDataTransferControllerGetIssuesResponse>;
export declare const getCompanyDataTransferControllerGetIssuesQueryKey: (jobId?: string, params?: CompanyDataTransferControllerGetIssuesParams) => readonly [`/api/v1/companies/import/${string}/issues`, ...CompanyDataTransferControllerGetIssuesParams[]];
export declare const getCompanyDataTransferControllerGetIssuesQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError = unknown>(jobId: string, params: CompanyDataTransferControllerGetIssuesParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerGetIssuesQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>>;
export type CompanyDataTransferControllerGetIssuesQueryError = unknown;
export declare function useCompanyDataTransferControllerGetIssues<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError = unknown>(jobId: string, params: CompanyDataTransferControllerGetIssuesParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerGetIssues<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError = unknown>(jobId: string, params: CompanyDataTransferControllerGetIssuesParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerGetIssues<TData = Awaited<ReturnType<typeof companyDataTransferControllerGetIssues>>, TError = unknown>(jobId: string, params: CompanyDataTransferControllerGetIssuesParams, options?: {
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
export declare const getCompanyDataTransferControllerExportUrl: (params: CompanyDataTransferControllerExportParams) => string;
export declare const companyDataTransferControllerExport: (params: CompanyDataTransferControllerExportParams, options?: RequestInit) => Promise<companyDataTransferControllerExportResponse>;
export declare const getCompanyDataTransferControllerExportQueryKey: (params?: CompanyDataTransferControllerExportParams) => readonly ["/api/v1/companies/export", ...CompanyDataTransferControllerExportParams[]];
export declare const getCompanyDataTransferControllerExportQueryOptions: <TData = Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError = unknown>(params: CompanyDataTransferControllerExportParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyDataTransferControllerExportQueryResult = NonNullable<Awaited<ReturnType<typeof companyDataTransferControllerExport>>>;
export type CompanyDataTransferControllerExportQueryError = unknown;
export declare function useCompanyDataTransferControllerExport<TData = Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError = unknown>(params: CompanyDataTransferControllerExportParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerExport>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerExport<TData = Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError = unknown>(params: CompanyDataTransferControllerExportParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError, Awaited<ReturnType<typeof companyDataTransferControllerExport>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyDataTransferControllerExport<TData = Awaited<ReturnType<typeof companyDataTransferControllerExport>>, TError = unknown>(params: CompanyDataTransferControllerExportParams, options?: {
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
export declare const getCompanyControllerListUrl: (params?: CompanyControllerListParams) => string;
export declare const companyControllerList: (params?: CompanyControllerListParams, options?: RequestInit) => Promise<companyControllerListResponse>;
export declare const getCompanyControllerListQueryKey: (params?: CompanyControllerListParams) => readonly ["/api/v1/companies", ...CompanyControllerListParams[]];
export declare const getCompanyControllerListQueryOptions: <TData = Awaited<ReturnType<typeof companyControllerList>>, TError = unknown>(params?: CompanyControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyControllerListQueryResult = NonNullable<Awaited<ReturnType<typeof companyControllerList>>>;
export type CompanyControllerListQueryError = unknown;
export declare function useCompanyControllerList<TData = Awaited<ReturnType<typeof companyControllerList>>, TError = unknown>(params: undefined | CompanyControllerListParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, Awaited<ReturnType<typeof companyControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerList<TData = Awaited<ReturnType<typeof companyControllerList>>, TError = unknown>(params?: CompanyControllerListParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerList>>, TError, Awaited<ReturnType<typeof companyControllerList>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerList<TData = Awaited<ReturnType<typeof companyControllerList>>, TError = unknown>(params?: CompanyControllerListParams, options?: {
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
export declare const getCompanyControllerGetOptionsUrl: (params?: CompanyControllerGetOptionsParams) => string;
export declare const companyControllerGetOptions: (params?: CompanyControllerGetOptionsParams, options?: RequestInit) => Promise<companyControllerGetOptionsResponse>;
export declare const getCompanyControllerGetOptionsQueryKey: (params?: CompanyControllerGetOptionsParams) => readonly ["/api/v1/companies/options", ...CompanyControllerGetOptionsParams[]];
export declare const getCompanyControllerGetOptionsQueryOptions: <TData = Awaited<ReturnType<typeof companyControllerGetOptions>>, TError = unknown>(params?: CompanyControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyControllerGetOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof companyControllerGetOptions>>>;
export type CompanyControllerGetOptionsQueryError = unknown;
export declare function useCompanyControllerGetOptions<TData = Awaited<ReturnType<typeof companyControllerGetOptions>>, TError = unknown>(params: undefined | CompanyControllerGetOptionsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, Awaited<ReturnType<typeof companyControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerGetOptions<TData = Awaited<ReturnType<typeof companyControllerGetOptions>>, TError = unknown>(params?: CompanyControllerGetOptionsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerGetOptions>>, TError, Awaited<ReturnType<typeof companyControllerGetOptions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerGetOptions<TData = Awaited<ReturnType<typeof companyControllerGetOptions>>, TError = unknown>(params?: CompanyControllerGetOptionsParams, options?: {
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
export declare const getCompanyControllerCheckDuplicatesUrl: (params?: CompanyControllerCheckDuplicatesParams) => string;
export declare const companyControllerCheckDuplicates: (params?: CompanyControllerCheckDuplicatesParams, options?: RequestInit) => Promise<companyControllerCheckDuplicatesResponse>;
export declare const getCompanyControllerCheckDuplicatesQueryKey: (params?: CompanyControllerCheckDuplicatesParams) => readonly ["/api/v1/companies/duplicate-check", ...CompanyControllerCheckDuplicatesParams[]];
export declare const getCompanyControllerCheckDuplicatesQueryOptions: <TData = Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError = unknown>(params?: CompanyControllerCheckDuplicatesParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CompanyControllerCheckDuplicatesQueryResult = NonNullable<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>>;
export type CompanyControllerCheckDuplicatesQueryError = unknown;
export declare function useCompanyControllerCheckDuplicates<TData = Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError = unknown>(params: undefined | CompanyControllerCheckDuplicatesParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, Awaited<ReturnType<typeof companyControllerCheckDuplicates>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerCheckDuplicates<TData = Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError = unknown>(params?: CompanyControllerCheckDuplicatesParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError, Awaited<ReturnType<typeof companyControllerCheckDuplicates>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCompanyControllerCheckDuplicates<TData = Awaited<ReturnType<typeof companyControllerCheckDuplicates>>, TError = unknown>(params?: CompanyControllerCheckDuplicatesParams, options?: {
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
export declare const getPersonControllerLookupUrl: (params?: PersonControllerLookupParams) => string;
export declare const personControllerLookup: (params?: PersonControllerLookupParams, options?: RequestInit) => Promise<personControllerLookupResponse>;
export declare const getPersonControllerLookupQueryKey: (params?: PersonControllerLookupParams) => readonly ["/api/v1/persons/lookup", ...PersonControllerLookupParams[]];
export declare const getPersonControllerLookupQueryOptions: <TData = Awaited<ReturnType<typeof personControllerLookup>>, TError = unknown>(params?: PersonControllerLookupParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type PersonControllerLookupQueryResult = NonNullable<Awaited<ReturnType<typeof personControllerLookup>>>;
export type PersonControllerLookupQueryError = unknown;
export declare function usePersonControllerLookup<TData = Awaited<ReturnType<typeof personControllerLookup>>, TError = unknown>(params: undefined | PersonControllerLookupParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, Awaited<ReturnType<typeof personControllerLookup>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function usePersonControllerLookup<TData = Awaited<ReturnType<typeof personControllerLookup>>, TError = unknown>(params?: PersonControllerLookupParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, Awaited<ReturnType<typeof personControllerLookup>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function usePersonControllerLookup<TData = Awaited<ReturnType<typeof personControllerLookup>>, TError = unknown>(params?: PersonControllerLookupParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof personControllerLookup>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Punch in for today
 */
export type attendanceControllerPunchInResponse200 = {
    data: TodayAttendanceBlockDto;
    status: 200;
};
export type attendanceControllerPunchInResponseSuccess = (attendanceControllerPunchInResponse200) & {
    headers: Headers;
};
export type attendanceControllerPunchInResponse = (attendanceControllerPunchInResponseSuccess);
export declare const getAttendanceControllerPunchInUrl: () => string;
export declare const attendanceControllerPunchIn: (options?: RequestInit) => Promise<attendanceControllerPunchInResponse>;
export declare const getAttendanceControllerPunchInMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerPunchIn>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerPunchIn>>, TError, void, TContext>;
export type AttendanceControllerPunchInMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerPunchIn>>>;
export type AttendanceControllerPunchInMutationError = unknown;
/**
* @summary Punch in for today
*/
export declare const useAttendanceControllerPunchIn: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerPunchIn>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerPunchIn>>, TError, void, TContext>;
/**
 * @summary Punch out for today
 */
export type attendanceControllerPunchOutResponse200 = {
    data: TodayAttendanceBlockDto;
    status: 200;
};
export type attendanceControllerPunchOutResponseSuccess = (attendanceControllerPunchOutResponse200) & {
    headers: Headers;
};
export type attendanceControllerPunchOutResponse = (attendanceControllerPunchOutResponseSuccess);
export declare const getAttendanceControllerPunchOutUrl: () => string;
export declare const attendanceControllerPunchOut: (options?: RequestInit) => Promise<attendanceControllerPunchOutResponse>;
export declare const getAttendanceControllerPunchOutMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerPunchOut>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerPunchOut>>, TError, void, TContext>;
export type AttendanceControllerPunchOutMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerPunchOut>>>;
export type AttendanceControllerPunchOutMutationError = unknown;
/**
* @summary Punch out for today
*/
export declare const useAttendanceControllerPunchOut: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerPunchOut>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerPunchOut>>, TError, void, TContext>;
/**
 * @summary Start a break
 */
export type attendanceControllerStartBreak0Response200 = {
    data: TodayAttendanceBlockDto;
    status: 200;
};
export type attendanceControllerStartBreak0ResponseSuccess = (attendanceControllerStartBreak0Response200) & {
    headers: Headers;
};
export type attendanceControllerStartBreak0Response = (attendanceControllerStartBreak0ResponseSuccess);
export declare const getAttendanceControllerStartBreak0Url: () => string;
export declare const attendanceControllerStartBreak0: (startBreakDto: StartBreakDto, options?: RequestInit) => Promise<attendanceControllerStartBreak0Response>;
export declare const getAttendanceControllerStartBreak0MutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerStartBreak0>>, TError, {
        data: StartBreakDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerStartBreak0>>, TError, {
    data: StartBreakDto;
}, TContext>;
export type AttendanceControllerStartBreak0MutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerStartBreak0>>>;
export type AttendanceControllerStartBreak0MutationBody = StartBreakDto;
export type AttendanceControllerStartBreak0MutationError = unknown;
/**
* @summary Start a break
*/
export declare const useAttendanceControllerStartBreak0: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerStartBreak0>>, TError, {
        data: StartBreakDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerStartBreak0>>, TError, {
    data: StartBreakDto;
}, TContext>;
/**
 * @summary Start a break
 */
export type attendanceControllerStartBreak1Response200 = {
    data: TodayAttendanceBlockDto;
    status: 200;
};
export type attendanceControllerStartBreak1ResponseSuccess = (attendanceControllerStartBreak1Response200) & {
    headers: Headers;
};
export type attendanceControllerStartBreak1Response = (attendanceControllerStartBreak1ResponseSuccess);
export declare const getAttendanceControllerStartBreak1Url: () => string;
export declare const attendanceControllerStartBreak1: (startBreakDto: StartBreakDto, options?: RequestInit) => Promise<attendanceControllerStartBreak1Response>;
export declare const getAttendanceControllerStartBreak1MutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerStartBreak1>>, TError, {
        data: StartBreakDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerStartBreak1>>, TError, {
    data: StartBreakDto;
}, TContext>;
export type AttendanceControllerStartBreak1MutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerStartBreak1>>>;
export type AttendanceControllerStartBreak1MutationBody = StartBreakDto;
export type AttendanceControllerStartBreak1MutationError = unknown;
/**
* @summary Start a break
*/
export declare const useAttendanceControllerStartBreak1: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerStartBreak1>>, TError, {
        data: StartBreakDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerStartBreak1>>, TError, {
    data: StartBreakDto;
}, TContext>;
/**
 * @summary End a break (resume working)
 */
export type attendanceControllerEndBreak0Response200 = {
    data: TodayAttendanceBlockDto;
    status: 200;
};
export type attendanceControllerEndBreak0ResponseSuccess = (attendanceControllerEndBreak0Response200) & {
    headers: Headers;
};
export type attendanceControllerEndBreak0Response = (attendanceControllerEndBreak0ResponseSuccess);
export declare const getAttendanceControllerEndBreak0Url: () => string;
export declare const attendanceControllerEndBreak0: (options?: RequestInit) => Promise<attendanceControllerEndBreak0Response>;
export declare const getAttendanceControllerEndBreak0MutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerEndBreak0>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerEndBreak0>>, TError, void, TContext>;
export type AttendanceControllerEndBreak0MutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerEndBreak0>>>;
export type AttendanceControllerEndBreak0MutationError = unknown;
/**
* @summary End a break (resume working)
*/
export declare const useAttendanceControllerEndBreak0: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerEndBreak0>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerEndBreak0>>, TError, void, TContext>;
/**
 * @summary End a break (resume working)
 */
export type attendanceControllerEndBreak1Response200 = {
    data: TodayAttendanceBlockDto;
    status: 200;
};
export type attendanceControllerEndBreak1ResponseSuccess = (attendanceControllerEndBreak1Response200) & {
    headers: Headers;
};
export type attendanceControllerEndBreak1Response = (attendanceControllerEndBreak1ResponseSuccess);
export declare const getAttendanceControllerEndBreak1Url: () => string;
export declare const attendanceControllerEndBreak1: (options?: RequestInit) => Promise<attendanceControllerEndBreak1Response>;
export declare const getAttendanceControllerEndBreak1MutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerEndBreak1>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerEndBreak1>>, TError, void, TContext>;
export type AttendanceControllerEndBreak1MutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerEndBreak1>>>;
export type AttendanceControllerEndBreak1MutationError = unknown;
/**
* @summary End a break (resume working)
*/
export declare const useAttendanceControllerEndBreak1: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerEndBreak1>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerEndBreak1>>, TError, void, TContext>;
/**
 * @summary Get current employee attendance status for today
 */
export type attendanceControllerGetTodayResponse200 = {
    data: TodayAttendanceBlockDto;
    status: 200;
};
export type attendanceControllerGetTodayResponseSuccess = (attendanceControllerGetTodayResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetTodayResponse = (attendanceControllerGetTodayResponseSuccess);
export declare const getAttendanceControllerGetTodayUrl: () => string;
export declare const attendanceControllerGetToday: (options?: RequestInit) => Promise<attendanceControllerGetTodayResponse>;
export declare const getAttendanceControllerGetTodayQueryKey: () => readonly ["/api/v1/attendance/today"];
export declare const getAttendanceControllerGetTodayQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetTodayQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetToday>>>;
export type AttendanceControllerGetTodayQueryError = unknown;
export declare function useAttendanceControllerGetToday<TData = Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError, Awaited<ReturnType<typeof attendanceControllerGetToday>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetToday<TData = Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError, Awaited<ReturnType<typeof attendanceControllerGetToday>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetToday<TData = Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetToday>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get full attendance dashboard for current employee and month
 */
export type attendanceControllerGetDashboardResponse200 = {
    data: DashboardResponseDto;
    status: 200;
};
export type attendanceControllerGetDashboardResponseSuccess = (attendanceControllerGetDashboardResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetDashboardResponse = (attendanceControllerGetDashboardResponseSuccess);
export declare const getAttendanceControllerGetDashboardUrl: (params?: AttendanceControllerGetDashboardParams) => string;
export declare const attendanceControllerGetDashboard: (params?: AttendanceControllerGetDashboardParams, options?: RequestInit) => Promise<attendanceControllerGetDashboardResponse>;
export declare const getAttendanceControllerGetDashboardQueryKey: (params?: AttendanceControllerGetDashboardParams) => readonly ["/api/v1/attendance/me/dashboard", ...AttendanceControllerGetDashboardParams[]];
export declare const getAttendanceControllerGetDashboardQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError = unknown>(params?: AttendanceControllerGetDashboardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetDashboard>>>;
export type AttendanceControllerGetDashboardQueryError = unknown;
export declare function useAttendanceControllerGetDashboard<TData = Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError = unknown>(params: undefined | AttendanceControllerGetDashboardParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError, Awaited<ReturnType<typeof attendanceControllerGetDashboard>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetDashboard<TData = Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError = unknown>(params?: AttendanceControllerGetDashboardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError, Awaited<ReturnType<typeof attendanceControllerGetDashboard>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetDashboard<TData = Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError = unknown>(params?: AttendanceControllerGetDashboardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDashboard>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get month attendance data for current employee
 */
export type attendanceControllerGetMeResponse200 = {
    data: MonthBlockDto;
    status: 200;
};
export type attendanceControllerGetMeResponseSuccess = (attendanceControllerGetMeResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetMeResponse = (attendanceControllerGetMeResponseSuccess);
export declare const getAttendanceControllerGetMeUrl: (params?: AttendanceControllerGetMeParams) => string;
export declare const attendanceControllerGetMe: (params?: AttendanceControllerGetMeParams, options?: RequestInit) => Promise<attendanceControllerGetMeResponse>;
export declare const getAttendanceControllerGetMeQueryKey: (params?: AttendanceControllerGetMeParams) => readonly ["/api/v1/attendance/me", ...AttendanceControllerGetMeParams[]];
export declare const getAttendanceControllerGetMeQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError = unknown>(params?: AttendanceControllerGetMeParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetMeQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetMe>>>;
export type AttendanceControllerGetMeQueryError = unknown;
export declare function useAttendanceControllerGetMe<TData = Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError = unknown>(params: undefined | AttendanceControllerGetMeParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError, Awaited<ReturnType<typeof attendanceControllerGetMe>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetMe<TData = Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError = unknown>(params?: AttendanceControllerGetMeParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError, Awaited<ReturnType<typeof attendanceControllerGetMe>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetMe<TData = Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError = unknown>(params?: AttendanceControllerGetMeParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetMe>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get attendance day details by date
 */
export type attendanceControllerGetDayDetailResponse200 = {
    data: DayDetailDto;
    status: 200;
};
export type attendanceControllerGetDayDetailResponseSuccess = (attendanceControllerGetDayDetailResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetDayDetailResponse = (attendanceControllerGetDayDetailResponseSuccess);
export declare const getAttendanceControllerGetDayDetailUrl: (date: string) => string;
export declare const attendanceControllerGetDayDetail: (date: string, options?: RequestInit) => Promise<attendanceControllerGetDayDetailResponse>;
export declare const getAttendanceControllerGetDayDetailQueryKey: (date?: string) => readonly [`/api/v1/attendance/me/days/${string}`];
export declare const getAttendanceControllerGetDayDetailQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError = unknown>(date: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetDayDetailQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>>;
export type AttendanceControllerGetDayDetailQueryError = unknown;
export declare function useAttendanceControllerGetDayDetail<TData = Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError = unknown>(date: string, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError, Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetDayDetail<TData = Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError = unknown>(date: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError, Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetDayDetail<TData = Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError = unknown>(date: string, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetDayDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Request attendance correction
 */
export type attendanceControllerCreateCorrectionResponse201 = {
    data: void;
    status: 201;
};
export type attendanceControllerCreateCorrectionResponseSuccess = (attendanceControllerCreateCorrectionResponse201) & {
    headers: Headers;
};
export type attendanceControllerCreateCorrectionResponse = (attendanceControllerCreateCorrectionResponseSuccess);
export declare const getAttendanceControllerCreateCorrectionUrl: () => string;
export declare const attendanceControllerCreateCorrection: (createCorrectionDto: CreateCorrectionDto, options?: RequestInit) => Promise<attendanceControllerCreateCorrectionResponse>;
export declare const getAttendanceControllerCreateCorrectionMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateCorrection>>, TError, {
        data: CreateCorrectionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateCorrection>>, TError, {
    data: CreateCorrectionDto;
}, TContext>;
export type AttendanceControllerCreateCorrectionMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerCreateCorrection>>>;
export type AttendanceControllerCreateCorrectionMutationBody = CreateCorrectionDto;
export type AttendanceControllerCreateCorrectionMutationError = unknown;
/**
* @summary Request attendance correction
*/
export declare const useAttendanceControllerCreateCorrection: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateCorrection>>, TError, {
        data: CreateCorrectionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerCreateCorrection>>, TError, {
    data: CreateCorrectionDto;
}, TContext>;
/**
 * @summary Approve attendance correction
 */
export type attendanceControllerApproveCorrectionResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerApproveCorrectionResponseSuccess = (attendanceControllerApproveCorrectionResponse200) & {
    headers: Headers;
};
export type attendanceControllerApproveCorrectionResponse = (attendanceControllerApproveCorrectionResponseSuccess);
export declare const getAttendanceControllerApproveCorrectionUrl: (id: number) => string;
export declare const attendanceControllerApproveCorrection: (id: number, options?: RequestInit) => Promise<attendanceControllerApproveCorrectionResponse>;
export declare const getAttendanceControllerApproveCorrectionMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerApproveCorrection>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerApproveCorrection>>, TError, {
    id: number;
}, TContext>;
export type AttendanceControllerApproveCorrectionMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerApproveCorrection>>>;
export type AttendanceControllerApproveCorrectionMutationError = unknown;
/**
* @summary Approve attendance correction
*/
export declare const useAttendanceControllerApproveCorrection: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerApproveCorrection>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerApproveCorrection>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Reject attendance correction
 */
export type attendanceControllerRejectCorrectionResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerRejectCorrectionResponseSuccess = (attendanceControllerRejectCorrectionResponse200) & {
    headers: Headers;
};
export type attendanceControllerRejectCorrectionResponse = (attendanceControllerRejectCorrectionResponseSuccess);
export declare const getAttendanceControllerRejectCorrectionUrl: (id: number) => string;
export declare const attendanceControllerRejectCorrection: (id: number, rejectCorrectionDto: RejectCorrectionDto, options?: RequestInit) => Promise<attendanceControllerRejectCorrectionResponse>;
export declare const getAttendanceControllerRejectCorrectionMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerRejectCorrection>>, TError, {
        id: number;
        data: RejectCorrectionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerRejectCorrection>>, TError, {
    id: number;
    data: RejectCorrectionDto;
}, TContext>;
export type AttendanceControllerRejectCorrectionMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerRejectCorrection>>>;
export type AttendanceControllerRejectCorrectionMutationBody = RejectCorrectionDto;
export type AttendanceControllerRejectCorrectionMutationError = unknown;
/**
* @summary Reject attendance correction
*/
export declare const useAttendanceControllerRejectCorrection: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerRejectCorrection>>, TError, {
        id: number;
        data: RejectCorrectionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerRejectCorrection>>, TError, {
    id: number;
    data: RejectCorrectionDto;
}, TContext>;
/**
 * @summary List attendance regularization requests
 */
export type attendanceControllerListRegularizationsResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerListRegularizationsResponseSuccess = (attendanceControllerListRegularizationsResponse200) & {
    headers: Headers;
};
export type attendanceControllerListRegularizationsResponse = (attendanceControllerListRegularizationsResponseSuccess);
export declare const getAttendanceControllerListRegularizationsUrl: (params?: AttendanceControllerListRegularizationsParams) => string;
export declare const attendanceControllerListRegularizations: (params?: AttendanceControllerListRegularizationsParams, options?: RequestInit) => Promise<attendanceControllerListRegularizationsResponse>;
export declare const getAttendanceControllerListRegularizationsQueryKey: (params?: AttendanceControllerListRegularizationsParams) => readonly ["/api/v1/attendance/regularizations", ...AttendanceControllerListRegularizationsParams[]];
export declare const getAttendanceControllerListRegularizationsQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError = unknown>(params?: AttendanceControllerListRegularizationsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerListRegularizationsQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerListRegularizations>>>;
export type AttendanceControllerListRegularizationsQueryError = unknown;
export declare function useAttendanceControllerListRegularizations<TData = Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError = unknown>(params: undefined | AttendanceControllerListRegularizationsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError, Awaited<ReturnType<typeof attendanceControllerListRegularizations>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerListRegularizations<TData = Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError = unknown>(params?: AttendanceControllerListRegularizationsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError, Awaited<ReturnType<typeof attendanceControllerListRegularizations>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerListRegularizations<TData = Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError = unknown>(params?: AttendanceControllerListRegularizationsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerListRegularizations>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create attendance regularization request
 */
export type attendanceControllerCreateRegularizationResponse201 = {
    data: void;
    status: 201;
};
export type attendanceControllerCreateRegularizationResponseSuccess = (attendanceControllerCreateRegularizationResponse201) & {
    headers: Headers;
};
export type attendanceControllerCreateRegularizationResponse = (attendanceControllerCreateRegularizationResponseSuccess);
export declare const getAttendanceControllerCreateRegularizationUrl: () => string;
export declare const attendanceControllerCreateRegularization: (createRegularizationDto: CreateRegularizationDto, options?: RequestInit) => Promise<attendanceControllerCreateRegularizationResponse>;
export declare const getAttendanceControllerCreateRegularizationMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateRegularization>>, TError, {
        data: CreateRegularizationDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateRegularization>>, TError, {
    data: CreateRegularizationDto;
}, TContext>;
export type AttendanceControllerCreateRegularizationMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerCreateRegularization>>>;
export type AttendanceControllerCreateRegularizationMutationBody = CreateRegularizationDto;
export type AttendanceControllerCreateRegularizationMutationError = unknown;
/**
* @summary Create attendance regularization request
*/
export declare const useAttendanceControllerCreateRegularization: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateRegularization>>, TError, {
        data: CreateRegularizationDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerCreateRegularization>>, TError, {
    data: CreateRegularizationDto;
}, TContext>;
/**
 * @summary Get regularization request detail
 */
export type attendanceControllerGetRegularizationDetailResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerGetRegularizationDetailResponseSuccess = (attendanceControllerGetRegularizationDetailResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetRegularizationDetailResponse = (attendanceControllerGetRegularizationDetailResponseSuccess);
export declare const getAttendanceControllerGetRegularizationDetailUrl: (id: number) => string;
export declare const attendanceControllerGetRegularizationDetail: (id: number, options?: RequestInit) => Promise<attendanceControllerGetRegularizationDetailResponse>;
export declare const getAttendanceControllerGetRegularizationDetailQueryKey: (id?: number) => readonly ["/api/v1/attendance/regularizations/undefined" | `/api/v1/attendance/regularizations/${number}`];
export declare const getAttendanceControllerGetRegularizationDetailQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetRegularizationDetailQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>>;
export type AttendanceControllerGetRegularizationDetailQueryError = unknown;
export declare function useAttendanceControllerGetRegularizationDetail<TData = Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError, Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetRegularizationDetail<TData = Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError, Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetRegularizationDetail<TData = Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetRegularizationDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Cancel regularization request
 */
export type attendanceControllerCancelRegularizationResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerCancelRegularizationResponseSuccess = (attendanceControllerCancelRegularizationResponse200) & {
    headers: Headers;
};
export type attendanceControllerCancelRegularizationResponse = (attendanceControllerCancelRegularizationResponseSuccess);
export declare const getAttendanceControllerCancelRegularizationUrl: (id: number) => string;
export declare const attendanceControllerCancelRegularization: (id: number, options?: RequestInit) => Promise<attendanceControllerCancelRegularizationResponse>;
export declare const getAttendanceControllerCancelRegularizationMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCancelRegularization>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCancelRegularization>>, TError, {
    id: number;
}, TContext>;
export type AttendanceControllerCancelRegularizationMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerCancelRegularization>>>;
export type AttendanceControllerCancelRegularizationMutationError = unknown;
/**
* @summary Cancel regularization request
*/
export declare const useAttendanceControllerCancelRegularization: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCancelRegularization>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerCancelRegularization>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Approve regularization request
 */
export type attendanceControllerApproveRegularizationResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerApproveRegularizationResponseSuccess = (attendanceControllerApproveRegularizationResponse200) & {
    headers: Headers;
};
export type attendanceControllerApproveRegularizationResponse = (attendanceControllerApproveRegularizationResponseSuccess);
export declare const getAttendanceControllerApproveRegularizationUrl: (id: number) => string;
export declare const attendanceControllerApproveRegularization: (id: number, approveRegularizationDto: ApproveRegularizationDto, options?: RequestInit) => Promise<attendanceControllerApproveRegularizationResponse>;
export declare const getAttendanceControllerApproveRegularizationMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerApproveRegularization>>, TError, {
        id: number;
        data: ApproveRegularizationDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerApproveRegularization>>, TError, {
    id: number;
    data: ApproveRegularizationDto;
}, TContext>;
export type AttendanceControllerApproveRegularizationMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerApproveRegularization>>>;
export type AttendanceControllerApproveRegularizationMutationBody = ApproveRegularizationDto;
export type AttendanceControllerApproveRegularizationMutationError = unknown;
/**
* @summary Approve regularization request
*/
export declare const useAttendanceControllerApproveRegularization: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerApproveRegularization>>, TError, {
        id: number;
        data: ApproveRegularizationDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerApproveRegularization>>, TError, {
    id: number;
    data: ApproveRegularizationDto;
}, TContext>;
/**
 * @summary Reject regularization request
 */
export type attendanceControllerRejectRegularizationResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerRejectRegularizationResponseSuccess = (attendanceControllerRejectRegularizationResponse200) & {
    headers: Headers;
};
export type attendanceControllerRejectRegularizationResponse = (attendanceControllerRejectRegularizationResponseSuccess);
export declare const getAttendanceControllerRejectRegularizationUrl: (id: number) => string;
export declare const attendanceControllerRejectRegularization: (id: number, rejectRegularizationDto: RejectRegularizationDto, options?: RequestInit) => Promise<attendanceControllerRejectRegularizationResponse>;
export declare const getAttendanceControllerRejectRegularizationMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerRejectRegularization>>, TError, {
        id: number;
        data: RejectRegularizationDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerRejectRegularization>>, TError, {
    id: number;
    data: RejectRegularizationDto;
}, TContext>;
export type AttendanceControllerRejectRegularizationMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerRejectRegularization>>>;
export type AttendanceControllerRejectRegularizationMutationBody = RejectRegularizationDto;
export type AttendanceControllerRejectRegularizationMutationError = unknown;
/**
* @summary Reject regularization request
*/
export declare const useAttendanceControllerRejectRegularization: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerRejectRegularization>>, TError, {
        id: number;
        data: RejectRegularizationDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerRejectRegularization>>, TError, {
    id: number;
    data: RejectRegularizationDto;
}, TContext>;
/**
 * @summary Bulk approve regularization requests
 */
export type attendanceControllerBulkApproveRegularizationsResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerBulkApproveRegularizationsResponseSuccess = (attendanceControllerBulkApproveRegularizationsResponse200) & {
    headers: Headers;
};
export type attendanceControllerBulkApproveRegularizationsResponse = (attendanceControllerBulkApproveRegularizationsResponseSuccess);
export declare const getAttendanceControllerBulkApproveRegularizationsUrl: () => string;
export declare const attendanceControllerBulkApproveRegularizations: (bulkApproveRegularizationDto: BulkApproveRegularizationDto, options?: RequestInit) => Promise<attendanceControllerBulkApproveRegularizationsResponse>;
export declare const getAttendanceControllerBulkApproveRegularizationsMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerBulkApproveRegularizations>>, TError, {
        data: BulkApproveRegularizationDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerBulkApproveRegularizations>>, TError, {
    data: BulkApproveRegularizationDto;
}, TContext>;
export type AttendanceControllerBulkApproveRegularizationsMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerBulkApproveRegularizations>>>;
export type AttendanceControllerBulkApproveRegularizationsMutationBody = BulkApproveRegularizationDto;
export type AttendanceControllerBulkApproveRegularizationsMutationError = unknown;
/**
* @summary Bulk approve regularization requests
*/
export declare const useAttendanceControllerBulkApproveRegularizations: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerBulkApproveRegularizations>>, TError, {
        data: BulkApproveRegularizationDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerBulkApproveRegularizations>>, TError, {
    data: BulkApproveRegularizationDto;
}, TContext>;
/**
 * @summary Admin edit attendance day
 */
export type attendanceControllerAdminUpsertDayResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerAdminUpsertDayResponseSuccess = (attendanceControllerAdminUpsertDayResponse200) & {
    headers: Headers;
};
export type attendanceControllerAdminUpsertDayResponse = (attendanceControllerAdminUpsertDayResponseSuccess);
export declare const getAttendanceControllerAdminUpsertDayUrl: (id: number, date: string) => string;
export declare const attendanceControllerAdminUpsertDay: (id: number, date: string, adminUpsertDayDto: AdminUpsertDayDto, options?: RequestInit) => Promise<attendanceControllerAdminUpsertDayResponse>;
export declare const getAttendanceControllerAdminUpsertDayMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAdminUpsertDay>>, TError, {
        id: number;
        date: string;
        data: AdminUpsertDayDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAdminUpsertDay>>, TError, {
    id: number;
    date: string;
    data: AdminUpsertDayDto;
}, TContext>;
export type AttendanceControllerAdminUpsertDayMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerAdminUpsertDay>>>;
export type AttendanceControllerAdminUpsertDayMutationBody = AdminUpsertDayDto;
export type AttendanceControllerAdminUpsertDayMutationError = unknown;
/**
* @summary Admin edit attendance day
*/
export declare const useAttendanceControllerAdminUpsertDay: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAdminUpsertDay>>, TError, {
        id: number;
        date: string;
        data: AdminUpsertDayDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerAdminUpsertDay>>, TError, {
    id: number;
    date: string;
    data: AdminUpsertDayDto;
}, TContext>;
/**
 * @summary Get team attendance records
 */
export type attendanceControllerGetTeamResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerGetTeamResponseSuccess = (attendanceControllerGetTeamResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetTeamResponse = (attendanceControllerGetTeamResponseSuccess);
export declare const getAttendanceControllerGetTeamUrl: (params?: AttendanceControllerGetTeamParams) => string;
export declare const attendanceControllerGetTeam: (params?: AttendanceControllerGetTeamParams, options?: RequestInit) => Promise<attendanceControllerGetTeamResponse>;
export declare const getAttendanceControllerGetTeamQueryKey: (params?: AttendanceControllerGetTeamParams) => readonly ["/api/v1/attendance/team", ...AttendanceControllerGetTeamParams[]];
export declare const getAttendanceControllerGetTeamQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError = unknown>(params?: AttendanceControllerGetTeamParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetTeamQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetTeam>>>;
export type AttendanceControllerGetTeamQueryError = unknown;
export declare function useAttendanceControllerGetTeam<TData = Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError = unknown>(params: undefined | AttendanceControllerGetTeamParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError, Awaited<ReturnType<typeof attendanceControllerGetTeam>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetTeam<TData = Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError = unknown>(params?: AttendanceControllerGetTeamParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError, Awaited<ReturnType<typeof attendanceControllerGetTeam>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetTeam<TData = Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError = unknown>(params?: AttendanceControllerGetTeamParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetTeam>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Export monthly attendance report as CSV
 */
export type attendanceControllerGetReportResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerGetReportResponseSuccess = (attendanceControllerGetReportResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetReportResponse = (attendanceControllerGetReportResponseSuccess);
export declare const getAttendanceControllerGetReportUrl: (params: AttendanceControllerGetReportParams) => string;
export declare const attendanceControllerGetReport: (params: AttendanceControllerGetReportParams, options?: RequestInit) => Promise<attendanceControllerGetReportResponse>;
export declare const getAttendanceControllerGetReportQueryKey: (params?: AttendanceControllerGetReportParams) => readonly ["/api/v1/attendance/report/csv", ...AttendanceControllerGetReportParams[]];
export declare const getAttendanceControllerGetReportQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError = unknown>(params: AttendanceControllerGetReportParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetReportQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetReport>>>;
export type AttendanceControllerGetReportQueryError = unknown;
export declare function useAttendanceControllerGetReport<TData = Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError = unknown>(params: AttendanceControllerGetReportParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError, Awaited<ReturnType<typeof attendanceControllerGetReport>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetReport<TData = Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError = unknown>(params: AttendanceControllerGetReportParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError, Awaited<ReturnType<typeof attendanceControllerGetReport>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetReport<TData = Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError = unknown>(params: AttendanceControllerGetReportParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetReport>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get organizational attendance settings
 */
export type attendanceControllerGetSettingsResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerGetSettingsResponseSuccess = (attendanceControllerGetSettingsResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetSettingsResponse = (attendanceControllerGetSettingsResponseSuccess);
export declare const getAttendanceControllerGetSettingsUrl: () => string;
export declare const attendanceControllerGetSettings: (options?: RequestInit) => Promise<attendanceControllerGetSettingsResponse>;
export declare const getAttendanceControllerGetSettingsQueryKey: () => readonly ["/api/v1/attendance/settings"];
export declare const getAttendanceControllerGetSettingsQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetSettings>>>;
export type AttendanceControllerGetSettingsQueryError = unknown;
export declare function useAttendanceControllerGetSettings<TData = Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError, Awaited<ReturnType<typeof attendanceControllerGetSettings>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetSettings<TData = Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError, Awaited<ReturnType<typeof attendanceControllerGetSettings>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetSettings<TData = Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetSettings>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update working and work off days
 */
export type attendanceControllerUpdateWorkingDaysResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerUpdateWorkingDaysResponseSuccess = (attendanceControllerUpdateWorkingDaysResponse200) & {
    headers: Headers;
};
export type attendanceControllerUpdateWorkingDaysResponse = (attendanceControllerUpdateWorkingDaysResponseSuccess);
export declare const getAttendanceControllerUpdateWorkingDaysUrl: () => string;
export declare const attendanceControllerUpdateWorkingDays: (options?: RequestInit) => Promise<attendanceControllerUpdateWorkingDaysResponse>;
export declare const getAttendanceControllerUpdateWorkingDaysMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateWorkingDays>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateWorkingDays>>, TError, void, TContext>;
export type AttendanceControllerUpdateWorkingDaysMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerUpdateWorkingDays>>>;
export type AttendanceControllerUpdateWorkingDaysMutationError = unknown;
/**
* @summary Update working and work off days
*/
export declare const useAttendanceControllerUpdateWorkingDays: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateWorkingDays>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerUpdateWorkingDays>>, TError, void, TContext>;
/**
 * @summary Add a new company holiday
 */
export type attendanceControllerAddHolidayResponse201 = {
    data: void;
    status: 201;
};
export type attendanceControllerAddHolidayResponseSuccess = (attendanceControllerAddHolidayResponse201) & {
    headers: Headers;
};
export type attendanceControllerAddHolidayResponse = (attendanceControllerAddHolidayResponseSuccess);
export declare const getAttendanceControllerAddHolidayUrl: () => string;
export declare const attendanceControllerAddHoliday: (options?: RequestInit) => Promise<attendanceControllerAddHolidayResponse>;
export declare const getAttendanceControllerAddHolidayMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAddHoliday>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAddHoliday>>, TError, void, TContext>;
export type AttendanceControllerAddHolidayMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerAddHoliday>>>;
export type AttendanceControllerAddHolidayMutationError = unknown;
/**
* @summary Add a new company holiday
*/
export declare const useAttendanceControllerAddHoliday: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAddHoliday>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerAddHoliday>>, TError, void, TContext>;
/**
 * @summary Delete a company holiday
 */
export type attendanceControllerDeleteHolidayResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerDeleteHolidayResponseSuccess = (attendanceControllerDeleteHolidayResponse200) & {
    headers: Headers;
};
export type attendanceControllerDeleteHolidayResponse = (attendanceControllerDeleteHolidayResponseSuccess);
export declare const getAttendanceControllerDeleteHolidayUrl: (id: string) => string;
export declare const attendanceControllerDeleteHoliday: (id: string, options?: RequestInit) => Promise<attendanceControllerDeleteHolidayResponse>;
export declare const getAttendanceControllerDeleteHolidayMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteHoliday>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteHoliday>>, TError, {
    id: string;
}, TContext>;
export type AttendanceControllerDeleteHolidayMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerDeleteHoliday>>>;
export type AttendanceControllerDeleteHolidayMutationError = unknown;
/**
* @summary Delete a company holiday
*/
export declare const useAttendanceControllerDeleteHoliday: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteHoliday>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerDeleteHoliday>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary Update default full day and half day working hours
 */
export type attendanceControllerUpdateDefaultHoursResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerUpdateDefaultHoursResponseSuccess = (attendanceControllerUpdateDefaultHoursResponse200) & {
    headers: Headers;
};
export type attendanceControllerUpdateDefaultHoursResponse = (attendanceControllerUpdateDefaultHoursResponseSuccess);
export declare const getAttendanceControllerUpdateDefaultHoursUrl: () => string;
export declare const attendanceControllerUpdateDefaultHours: (options?: RequestInit) => Promise<attendanceControllerUpdateDefaultHoursResponse>;
export declare const getAttendanceControllerUpdateDefaultHoursMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateDefaultHours>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateDefaultHours>>, TError, void, TContext>;
export type AttendanceControllerUpdateDefaultHoursMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerUpdateDefaultHours>>>;
export type AttendanceControllerUpdateDefaultHoursMutationError = unknown;
/**
* @summary Update default full day and half day working hours
*/
export declare const useAttendanceControllerUpdateDefaultHours: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateDefaultHours>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerUpdateDefaultHours>>, TError, void, TContext>;
/**
 * @summary Update or reset employee-specific working hours
 */
export type attendanceControllerUpdateEmployeeHoursResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerUpdateEmployeeHoursResponseSuccess = (attendanceControllerUpdateEmployeeHoursResponse200) & {
    headers: Headers;
};
export type attendanceControllerUpdateEmployeeHoursResponse = (attendanceControllerUpdateEmployeeHoursResponseSuccess);
export declare const getAttendanceControllerUpdateEmployeeHoursUrl: (id: number) => string;
export declare const attendanceControllerUpdateEmployeeHours: (id: number, options?: RequestInit) => Promise<attendanceControllerUpdateEmployeeHoursResponse>;
export declare const getAttendanceControllerUpdateEmployeeHoursMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateEmployeeHours>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateEmployeeHours>>, TError, {
    id: number;
}, TContext>;
export type AttendanceControllerUpdateEmployeeHoursMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerUpdateEmployeeHours>>>;
export type AttendanceControllerUpdateEmployeeHoursMutationError = unknown;
/**
* @summary Update or reset employee-specific working hours
*/
export declare const useAttendanceControllerUpdateEmployeeHours: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateEmployeeHours>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerUpdateEmployeeHours>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get all attendance shifts
 */
export type attendanceControllerGetShiftsResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerGetShiftsResponseSuccess = (attendanceControllerGetShiftsResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetShiftsResponse = (attendanceControllerGetShiftsResponseSuccess);
export declare const getAttendanceControllerGetShiftsUrl: () => string;
export declare const attendanceControllerGetShifts: (options?: RequestInit) => Promise<attendanceControllerGetShiftsResponse>;
export declare const getAttendanceControllerGetShiftsQueryKey: () => readonly ["/api/v1/attendance/settings/shifts"];
export declare const getAttendanceControllerGetShiftsQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetShiftsQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetShifts>>>;
export type AttendanceControllerGetShiftsQueryError = unknown;
export declare function useAttendanceControllerGetShifts<TData = Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError, Awaited<ReturnType<typeof attendanceControllerGetShifts>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetShifts<TData = Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError, Awaited<ReturnType<typeof attendanceControllerGetShifts>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetShifts<TData = Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShifts>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a new attendance shift
 */
export type attendanceControllerCreateShiftResponse201 = {
    data: void;
    status: 201;
};
export type attendanceControllerCreateShiftResponseSuccess = (attendanceControllerCreateShiftResponse201) & {
    headers: Headers;
};
export type attendanceControllerCreateShiftResponse = (attendanceControllerCreateShiftResponseSuccess);
export declare const getAttendanceControllerCreateShiftUrl: () => string;
export declare const attendanceControllerCreateShift: (options?: RequestInit) => Promise<attendanceControllerCreateShiftResponse>;
export declare const getAttendanceControllerCreateShiftMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateShift>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateShift>>, TError, void, TContext>;
export type AttendanceControllerCreateShiftMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerCreateShift>>>;
export type AttendanceControllerCreateShiftMutationError = unknown;
/**
* @summary Create a new attendance shift
*/
export declare const useAttendanceControllerCreateShift: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateShift>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerCreateShift>>, TError, void, TContext>;
/**
 * @summary Update an attendance shift
 */
export type attendanceControllerUpdateShiftResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerUpdateShiftResponseSuccess = (attendanceControllerUpdateShiftResponse200) & {
    headers: Headers;
};
export type attendanceControllerUpdateShiftResponse = (attendanceControllerUpdateShiftResponseSuccess);
export declare const getAttendanceControllerUpdateShiftUrl: (id: number) => string;
export declare const attendanceControllerUpdateShift: (id: number, options?: RequestInit) => Promise<attendanceControllerUpdateShiftResponse>;
export declare const getAttendanceControllerUpdateShiftMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateShift>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateShift>>, TError, {
    id: number;
}, TContext>;
export type AttendanceControllerUpdateShiftMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerUpdateShift>>>;
export type AttendanceControllerUpdateShiftMutationError = unknown;
/**
* @summary Update an attendance shift
*/
export declare const useAttendanceControllerUpdateShift: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateShift>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerUpdateShift>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Delete an attendance shift
 */
export type attendanceControllerDeleteShiftResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerDeleteShiftResponseSuccess = (attendanceControllerDeleteShiftResponse200) & {
    headers: Headers;
};
export type attendanceControllerDeleteShiftResponse = (attendanceControllerDeleteShiftResponseSuccess);
export declare const getAttendanceControllerDeleteShiftUrl: (id: number) => string;
export declare const attendanceControllerDeleteShift: (id: number, options?: RequestInit) => Promise<attendanceControllerDeleteShiftResponse>;
export declare const getAttendanceControllerDeleteShiftMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteShift>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteShift>>, TError, {
    id: number;
}, TContext>;
export type AttendanceControllerDeleteShiftMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerDeleteShift>>>;
export type AttendanceControllerDeleteShiftMutationError = unknown;
/**
* @summary Delete an attendance shift
*/
export declare const useAttendanceControllerDeleteShift: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteShift>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerDeleteShift>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Set a shift as the company default shift
 */
export type attendanceControllerSetDefaultShiftResponse201 = {
    data: void;
    status: 201;
};
export type attendanceControllerSetDefaultShiftResponseSuccess = (attendanceControllerSetDefaultShiftResponse201) & {
    headers: Headers;
};
export type attendanceControllerSetDefaultShiftResponse = (attendanceControllerSetDefaultShiftResponseSuccess);
export declare const getAttendanceControllerSetDefaultShiftUrl: (id: number) => string;
export declare const attendanceControllerSetDefaultShift: (id: number, options?: RequestInit) => Promise<attendanceControllerSetDefaultShiftResponse>;
export declare const getAttendanceControllerSetDefaultShiftMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerSetDefaultShift>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerSetDefaultShift>>, TError, {
    id: number;
}, TContext>;
export type AttendanceControllerSetDefaultShiftMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerSetDefaultShift>>>;
export type AttendanceControllerSetDefaultShiftMutationError = unknown;
/**
* @summary Set a shift as the company default shift
*/
export declare const useAttendanceControllerSetDefaultShift: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerSetDefaultShift>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerSetDefaultShift>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get all attendance statuses
 */
export type attendanceControllerGetStatusesResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerGetStatusesResponseSuccess = (attendanceControllerGetStatusesResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetStatusesResponse = (attendanceControllerGetStatusesResponseSuccess);
export declare const getAttendanceControllerGetStatusesUrl: () => string;
export declare const attendanceControllerGetStatuses: (options?: RequestInit) => Promise<attendanceControllerGetStatusesResponse>;
export declare const getAttendanceControllerGetStatusesQueryKey: () => readonly ["/api/v1/attendance/settings/statuses"];
export declare const getAttendanceControllerGetStatusesQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetStatusesQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetStatuses>>>;
export type AttendanceControllerGetStatusesQueryError = unknown;
export declare function useAttendanceControllerGetStatuses<TData = Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError, Awaited<ReturnType<typeof attendanceControllerGetStatuses>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetStatuses<TData = Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError, Awaited<ReturnType<typeof attendanceControllerGetStatuses>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetStatuses<TData = Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetStatuses>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a custom attendance status
 */
export type attendanceControllerCreateStatusResponse201 = {
    data: void;
    status: 201;
};
export type attendanceControllerCreateStatusResponseSuccess = (attendanceControllerCreateStatusResponse201) & {
    headers: Headers;
};
export type attendanceControllerCreateStatusResponse = (attendanceControllerCreateStatusResponseSuccess);
export declare const getAttendanceControllerCreateStatusUrl: () => string;
export declare const attendanceControllerCreateStatus: (options?: RequestInit) => Promise<attendanceControllerCreateStatusResponse>;
export declare const getAttendanceControllerCreateStatusMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateStatus>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateStatus>>, TError, void, TContext>;
export type AttendanceControllerCreateStatusMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerCreateStatus>>>;
export type AttendanceControllerCreateStatusMutationError = unknown;
/**
* @summary Create a custom attendance status
*/
export declare const useAttendanceControllerCreateStatus: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerCreateStatus>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerCreateStatus>>, TError, void, TContext>;
/**
 * @summary Update an attendance status
 */
export type attendanceControllerUpdateStatusResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerUpdateStatusResponseSuccess = (attendanceControllerUpdateStatusResponse200) & {
    headers: Headers;
};
export type attendanceControllerUpdateStatusResponse = (attendanceControllerUpdateStatusResponseSuccess);
export declare const getAttendanceControllerUpdateStatusUrl: (id: number) => string;
export declare const attendanceControllerUpdateStatus: (id: number, options?: RequestInit) => Promise<attendanceControllerUpdateStatusResponse>;
export declare const getAttendanceControllerUpdateStatusMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateStatus>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateStatus>>, TError, {
    id: number;
}, TContext>;
export type AttendanceControllerUpdateStatusMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerUpdateStatus>>>;
export type AttendanceControllerUpdateStatusMutationError = unknown;
/**
* @summary Update an attendance status
*/
export declare const useAttendanceControllerUpdateStatus: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerUpdateStatus>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerUpdateStatus>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Delete a custom attendance status
 */
export type attendanceControllerDeleteStatusResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerDeleteStatusResponseSuccess = (attendanceControllerDeleteStatusResponse200) & {
    headers: Headers;
};
export type attendanceControllerDeleteStatusResponse = (attendanceControllerDeleteStatusResponseSuccess);
export declare const getAttendanceControllerDeleteStatusUrl: (id: number) => string;
export declare const attendanceControllerDeleteStatus: (id: number, options?: RequestInit) => Promise<attendanceControllerDeleteStatusResponse>;
export declare const getAttendanceControllerDeleteStatusMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteStatus>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteStatus>>, TError, {
    id: number;
}, TContext>;
export type AttendanceControllerDeleteStatusMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerDeleteStatus>>>;
export type AttendanceControllerDeleteStatusMutationError = unknown;
/**
* @summary Delete a custom attendance status
*/
export declare const useAttendanceControllerDeleteStatus: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerDeleteStatus>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerDeleteStatus>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get employee shift assignments
 */
export type attendanceControllerGetShiftAssignmentsResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerGetShiftAssignmentsResponseSuccess = (attendanceControllerGetShiftAssignmentsResponse200) & {
    headers: Headers;
};
export type attendanceControllerGetShiftAssignmentsResponse = (attendanceControllerGetShiftAssignmentsResponseSuccess);
export declare const getAttendanceControllerGetShiftAssignmentsUrl: () => string;
export declare const attendanceControllerGetShiftAssignments: (options?: RequestInit) => Promise<attendanceControllerGetShiftAssignmentsResponse>;
export declare const getAttendanceControllerGetShiftAssignmentsQueryKey: () => readonly ["/api/v1/attendance/settings/shifts/assignments"];
export declare const getAttendanceControllerGetShiftAssignmentsQueryOptions: <TData = Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type AttendanceControllerGetShiftAssignmentsQueryResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>>;
export type AttendanceControllerGetShiftAssignmentsQueryError = unknown;
export declare function useAttendanceControllerGetShiftAssignments<TData = Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError, Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetShiftAssignments<TData = Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError, Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useAttendanceControllerGetShiftAssignments<TData = Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof attendanceControllerGetShiftAssignments>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Assign a shift to an employee
 */
export type attendanceControllerAssignShiftResponse200 = {
    data: void;
    status: 200;
};
export type attendanceControllerAssignShiftResponseSuccess = (attendanceControllerAssignShiftResponse200) & {
    headers: Headers;
};
export type attendanceControllerAssignShiftResponse = (attendanceControllerAssignShiftResponseSuccess);
export declare const getAttendanceControllerAssignShiftUrl: (empId: number) => string;
export declare const attendanceControllerAssignShift: (empId: number, options?: RequestInit) => Promise<attendanceControllerAssignShiftResponse>;
export declare const getAttendanceControllerAssignShiftMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAssignShift>>, TError, {
        empId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAssignShift>>, TError, {
    empId: number;
}, TContext>;
export type AttendanceControllerAssignShiftMutationResult = NonNullable<Awaited<ReturnType<typeof attendanceControllerAssignShift>>>;
export type AttendanceControllerAssignShiftMutationError = unknown;
/**
* @summary Assign a shift to an employee
*/
export declare const useAttendanceControllerAssignShift: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof attendanceControllerAssignShift>>, TError, {
        empId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof attendanceControllerAssignShift>>, TError, {
    empId: number;
}, TContext>;
/**
 * @summary Get current user notifications
 */
export type notificationsControllerGetNotificationsResponse200 = {
    data: NotificationResponseDto[];
    status: 200;
};
export type notificationsControllerGetNotificationsResponseSuccess = (notificationsControllerGetNotificationsResponse200) & {
    headers: Headers;
};
export type notificationsControllerGetNotificationsResponse = (notificationsControllerGetNotificationsResponseSuccess);
export declare const getNotificationsControllerGetNotificationsUrl: (params?: NotificationsControllerGetNotificationsParams) => string;
export declare const notificationsControllerGetNotifications: (params?: NotificationsControllerGetNotificationsParams, options?: RequestInit) => Promise<notificationsControllerGetNotificationsResponse>;
export declare const getNotificationsControllerGetNotificationsQueryKey: (params?: NotificationsControllerGetNotificationsParams) => readonly ["/api/v1/notifications", ...NotificationsControllerGetNotificationsParams[]];
export declare const getNotificationsControllerGetNotificationsQueryOptions: <TData = Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError = unknown>(params?: NotificationsControllerGetNotificationsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type NotificationsControllerGetNotificationsQueryResult = NonNullable<Awaited<ReturnType<typeof notificationsControllerGetNotifications>>>;
export type NotificationsControllerGetNotificationsQueryError = unknown;
export declare function useNotificationsControllerGetNotifications<TData = Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError = unknown>(params: undefined | NotificationsControllerGetNotificationsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError, Awaited<ReturnType<typeof notificationsControllerGetNotifications>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useNotificationsControllerGetNotifications<TData = Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError = unknown>(params?: NotificationsControllerGetNotificationsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError, Awaited<ReturnType<typeof notificationsControllerGetNotifications>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useNotificationsControllerGetNotifications<TData = Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError = unknown>(params?: NotificationsControllerGetNotificationsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetNotifications>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get unread notification count
 */
export type notificationsControllerGetUnreadCountResponse200 = {
    data: UnreadCountResponseDto;
    status: 200;
};
export type notificationsControllerGetUnreadCountResponseSuccess = (notificationsControllerGetUnreadCountResponse200) & {
    headers: Headers;
};
export type notificationsControllerGetUnreadCountResponse = (notificationsControllerGetUnreadCountResponseSuccess);
export declare const getNotificationsControllerGetUnreadCountUrl: () => string;
export declare const notificationsControllerGetUnreadCount: (options?: RequestInit) => Promise<notificationsControllerGetUnreadCountResponse>;
export declare const getNotificationsControllerGetUnreadCountQueryKey: () => readonly ["/api/v1/notifications/unread-count"];
export declare const getNotificationsControllerGetUnreadCountQueryOptions: <TData = Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type NotificationsControllerGetUnreadCountQueryResult = NonNullable<Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>>;
export type NotificationsControllerGetUnreadCountQueryError = unknown;
export declare function useNotificationsControllerGetUnreadCount<TData = Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError, Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useNotificationsControllerGetUnreadCount<TData = Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError, Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useNotificationsControllerGetUnreadCount<TData = Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof notificationsControllerGetUnreadCount>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Mark a notification as read
 */
export type notificationsControllerMarkReadResponse200 = {
    data: MarkReadResponseDto;
    status: 200;
};
export type notificationsControllerMarkReadResponseSuccess = (notificationsControllerMarkReadResponse200) & {
    headers: Headers;
};
export type notificationsControllerMarkReadResponse = (notificationsControllerMarkReadResponseSuccess);
export declare const getNotificationsControllerMarkReadUrl: (id: number) => string;
export declare const notificationsControllerMarkRead: (id: number, options?: RequestInit) => Promise<notificationsControllerMarkReadResponse>;
export declare const getNotificationsControllerMarkReadMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof notificationsControllerMarkRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof notificationsControllerMarkRead>>, TError, {
    id: number;
}, TContext>;
export type NotificationsControllerMarkReadMutationResult = NonNullable<Awaited<ReturnType<typeof notificationsControllerMarkRead>>>;
export type NotificationsControllerMarkReadMutationError = unknown;
/**
* @summary Mark a notification as read
*/
export declare const useNotificationsControllerMarkRead: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof notificationsControllerMarkRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof notificationsControllerMarkRead>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Mark all notifications as read
 */
export type notificationsControllerMarkAllReadResponse200 = {
    data: MarkAllReadResponseDto;
    status: 200;
};
export type notificationsControllerMarkAllReadResponseSuccess = (notificationsControllerMarkAllReadResponse200) & {
    headers: Headers;
};
export type notificationsControllerMarkAllReadResponse = (notificationsControllerMarkAllReadResponseSuccess);
export declare const getNotificationsControllerMarkAllReadUrl: () => string;
export declare const notificationsControllerMarkAllRead: (options?: RequestInit) => Promise<notificationsControllerMarkAllReadResponse>;
export declare const getNotificationsControllerMarkAllReadMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof notificationsControllerMarkAllRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof notificationsControllerMarkAllRead>>, TError, void, TContext>;
export type NotificationsControllerMarkAllReadMutationResult = NonNullable<Awaited<ReturnType<typeof notificationsControllerMarkAllRead>>>;
export type NotificationsControllerMarkAllReadMutationError = unknown;
/**
* @summary Mark all notifications as read
*/
export declare const useNotificationsControllerMarkAllRead: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof notificationsControllerMarkAllRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof notificationsControllerMarkAllRead>>, TError, void, TContext>;
/**
 * @summary Get admin task kanban board
 */
export type tasksControllerGetBoardResponse200 = {
    data: TaskBoardResultDto;
    status: 200;
};
export type tasksControllerGetBoardResponseSuccess = (tasksControllerGetBoardResponse200) & {
    headers: Headers;
};
export type tasksControllerGetBoardResponse = (tasksControllerGetBoardResponseSuccess);
export declare const getTasksControllerGetBoardUrl: (params?: TasksControllerGetBoardParams) => string;
export declare const tasksControllerGetBoard: (params?: TasksControllerGetBoardParams, options?: RequestInit) => Promise<tasksControllerGetBoardResponse>;
export declare const getTasksControllerGetBoardQueryKey: (params?: TasksControllerGetBoardParams) => readonly ["/api/v1/admin/tasks/board", ...TasksControllerGetBoardParams[]];
export declare const getTasksControllerGetBoardQueryOptions: <TData = Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError = unknown>(params?: TasksControllerGetBoardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type TasksControllerGetBoardQueryResult = NonNullable<Awaited<ReturnType<typeof tasksControllerGetBoard>>>;
export type TasksControllerGetBoardQueryError = unknown;
export declare function useTasksControllerGetBoard<TData = Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError = unknown>(params: undefined | TasksControllerGetBoardParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError, Awaited<ReturnType<typeof tasksControllerGetBoard>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetBoard<TData = Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError = unknown>(params?: TasksControllerGetBoardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError, Awaited<ReturnType<typeof tasksControllerGetBoard>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetBoard<TData = Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError = unknown>(params?: TasksControllerGetBoardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetBoard>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get admin task summary metrics
 */
export type tasksControllerGetSummaryResponse200 = {
    data: TaskSummaryDto;
    status: 200;
};
export type tasksControllerGetSummaryResponseSuccess = (tasksControllerGetSummaryResponse200) & {
    headers: Headers;
};
export type tasksControllerGetSummaryResponse = (tasksControllerGetSummaryResponseSuccess);
export declare const getTasksControllerGetSummaryUrl: () => string;
export declare const tasksControllerGetSummary: (options?: RequestInit) => Promise<tasksControllerGetSummaryResponse>;
export declare const getTasksControllerGetSummaryQueryKey: () => readonly ["/api/v1/admin/tasks/summary"];
export declare const getTasksControllerGetSummaryQueryOptions: <TData = Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type TasksControllerGetSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof tasksControllerGetSummary>>>;
export type TasksControllerGetSummaryQueryError = unknown;
export declare function useTasksControllerGetSummary<TData = Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError, Awaited<ReturnType<typeof tasksControllerGetSummary>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetSummary<TData = Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError, Awaited<ReturnType<typeof tasksControllerGetSummary>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetSummary<TData = Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSummary>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get count of tasks waiting in review
 */
export type tasksControllerGetRequestsCountResponse200 = {
    data: PendingReviewCountDto;
    status: 200;
};
export type tasksControllerGetRequestsCountResponseSuccess = (tasksControllerGetRequestsCountResponse200) & {
    headers: Headers;
};
export type tasksControllerGetRequestsCountResponse = (tasksControllerGetRequestsCountResponseSuccess);
export declare const getTasksControllerGetRequestsCountUrl: () => string;
export declare const tasksControllerGetRequestsCount: (options?: RequestInit) => Promise<tasksControllerGetRequestsCountResponse>;
export declare const getTasksControllerGetRequestsCountQueryKey: () => readonly ["/api/v1/admin/tasks/requests/count"];
export declare const getTasksControllerGetRequestsCountQueryOptions: <TData = Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type TasksControllerGetRequestsCountQueryResult = NonNullable<Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>>;
export type TasksControllerGetRequestsCountQueryError = unknown;
export declare function useTasksControllerGetRequestsCount<TData = Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError, Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetRequestsCount<TData = Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError, Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetRequestsCount<TData = Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetRequestsCount>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get list of active employees assignable to tasks
 */
export type tasksControllerGetAssignableEmployeesResponse200 = {
    data: AssignableEmployeeDto[];
    status: 200;
};
export type tasksControllerGetAssignableEmployeesResponseSuccess = (tasksControllerGetAssignableEmployeesResponse200) & {
    headers: Headers;
};
export type tasksControllerGetAssignableEmployeesResponse = (tasksControllerGetAssignableEmployeesResponseSuccess);
export declare const getTasksControllerGetAssignableEmployeesUrl: () => string;
export declare const tasksControllerGetAssignableEmployees: (options?: RequestInit) => Promise<tasksControllerGetAssignableEmployeesResponse>;
export declare const getTasksControllerGetAssignableEmployeesQueryKey: () => readonly ["/api/v1/admin/tasks/assignable-employees"];
export declare const getTasksControllerGetAssignableEmployeesQueryOptions: <TData = Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type TasksControllerGetAssignableEmployeesQueryResult = NonNullable<Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>>;
export type TasksControllerGetAssignableEmployeesQueryError = unknown;
export declare function useTasksControllerGetAssignableEmployees<TData = Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError, Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetAssignableEmployees<TData = Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError, Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetAssignableEmployees<TData = Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetAssignableEmployees>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a new task with assignees
 */
export type tasksControllerCreateTaskResponse201 = {
    data: TaskDetailDto;
    status: 201;
};
export type tasksControllerCreateTaskResponseSuccess = (tasksControllerCreateTaskResponse201) & {
    headers: Headers;
};
export type tasksControllerCreateTaskResponse = (tasksControllerCreateTaskResponseSuccess);
export declare const getTasksControllerCreateTaskUrl: () => string;
export declare const tasksControllerCreateTask: (createTaskDto: CreateTaskDto, options?: RequestInit) => Promise<tasksControllerCreateTaskResponse>;
export declare const getTasksControllerCreateTaskMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tasksControllerCreateTask>>, TError, {
        data: CreateTaskDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof tasksControllerCreateTask>>, TError, {
    data: CreateTaskDto;
}, TContext>;
export type TasksControllerCreateTaskMutationResult = NonNullable<Awaited<ReturnType<typeof tasksControllerCreateTask>>>;
export type TasksControllerCreateTaskMutationBody = CreateTaskDto;
export type TasksControllerCreateTaskMutationError = unknown;
/**
* @summary Create a new task with assignees
*/
export declare const useTasksControllerCreateTask: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tasksControllerCreateTask>>, TError, {
        data: CreateTaskDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof tasksControllerCreateTask>>, TError, {
    data: CreateTaskDto;
}, TContext>;
/**
 * @summary Get task details by ID with history
 */
export type tasksControllerGetTaskDetailResponse200 = {
    data: TaskDetailDto;
    status: 200;
};
export type tasksControllerGetTaskDetailResponseSuccess = (tasksControllerGetTaskDetailResponse200) & {
    headers: Headers;
};
export type tasksControllerGetTaskDetailResponse = (tasksControllerGetTaskDetailResponseSuccess);
export declare const getTasksControllerGetTaskDetailUrl: (id: number) => string;
export declare const tasksControllerGetTaskDetail: (id: number, options?: RequestInit) => Promise<tasksControllerGetTaskDetailResponse>;
export declare const getTasksControllerGetTaskDetailQueryKey: (id?: number) => readonly ["/api/v1/admin/tasks/undefined" | `/api/v1/admin/tasks/${number}`];
export declare const getTasksControllerGetTaskDetailQueryOptions: <TData = Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type TasksControllerGetTaskDetailQueryResult = NonNullable<Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>>;
export type TasksControllerGetTaskDetailQueryError = unknown;
export declare function useTasksControllerGetTaskDetail<TData = Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError, Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetTaskDetail<TData = Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError, Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetTaskDetail<TData = Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetTaskDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update task details or assignees
 */
export type tasksControllerUpdateTaskResponse200 = {
    data: TaskDetailDto;
    status: 200;
};
export type tasksControllerUpdateTaskResponseSuccess = (tasksControllerUpdateTaskResponse200) & {
    headers: Headers;
};
export type tasksControllerUpdateTaskResponse = (tasksControllerUpdateTaskResponseSuccess);
export declare const getTasksControllerUpdateTaskUrl: (id: number) => string;
export declare const tasksControllerUpdateTask: (id: number, updateTaskDto: UpdateTaskDto, options?: RequestInit) => Promise<tasksControllerUpdateTaskResponse>;
export declare const getTasksControllerUpdateTaskMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tasksControllerUpdateTask>>, TError, {
        id: number;
        data: UpdateTaskDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof tasksControllerUpdateTask>>, TError, {
    id: number;
    data: UpdateTaskDto;
}, TContext>;
export type TasksControllerUpdateTaskMutationResult = NonNullable<Awaited<ReturnType<typeof tasksControllerUpdateTask>>>;
export type TasksControllerUpdateTaskMutationBody = UpdateTaskDto;
export type TasksControllerUpdateTaskMutationError = unknown;
/**
* @summary Update task details or assignees
*/
export declare const useTasksControllerUpdateTask: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tasksControllerUpdateTask>>, TError, {
        id: number;
        data: UpdateTaskDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof tasksControllerUpdateTask>>, TError, {
    id: number;
    data: UpdateTaskDto;
}, TContext>;
/**
 * @summary Get sub tasks for a parent task
 */
export type tasksControllerGetSubTasksResponse200 = {
    data: TaskDetailDto[];
    status: 200;
};
export type tasksControllerGetSubTasksResponseSuccess = (tasksControllerGetSubTasksResponse200) & {
    headers: Headers;
};
export type tasksControllerGetSubTasksResponse = (tasksControllerGetSubTasksResponseSuccess);
export declare const getTasksControllerGetSubTasksUrl: (id: number) => string;
export declare const tasksControllerGetSubTasks: (id: number, options?: RequestInit) => Promise<tasksControllerGetSubTasksResponse>;
export declare const getTasksControllerGetSubTasksQueryKey: (id?: number) => readonly ["/api/v1/admin/tasks/undefined/subtasks" | `/api/v1/admin/tasks/${number}/subtasks`];
export declare const getTasksControllerGetSubTasksQueryOptions: <TData = Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type TasksControllerGetSubTasksQueryResult = NonNullable<Awaited<ReturnType<typeof tasksControllerGetSubTasks>>>;
export type TasksControllerGetSubTasksQueryError = unknown;
export declare function useTasksControllerGetSubTasks<TData = Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError, Awaited<ReturnType<typeof tasksControllerGetSubTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetSubTasks<TData = Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError, Awaited<ReturnType<typeof tasksControllerGetSubTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useTasksControllerGetSubTasks<TData = Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof tasksControllerGetSubTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Move task stage (admin)
 */
export type tasksControllerMoveStageResponse200 = {
    data: TaskDetailDto;
    status: 200;
};
export type tasksControllerMoveStageResponseSuccess = (tasksControllerMoveStageResponse200) & {
    headers: Headers;
};
export type tasksControllerMoveStageResponse = (tasksControllerMoveStageResponseSuccess);
export declare const getTasksControllerMoveStageUrl: (id: number) => string;
export declare const tasksControllerMoveStage: (id: number, moveTaskStageDto: MoveTaskStageDto, options?: RequestInit) => Promise<tasksControllerMoveStageResponse>;
export declare const getTasksControllerMoveStageMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tasksControllerMoveStage>>, TError, {
        id: number;
        data: MoveTaskStageDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof tasksControllerMoveStage>>, TError, {
    id: number;
    data: MoveTaskStageDto;
}, TContext>;
export type TasksControllerMoveStageMutationResult = NonNullable<Awaited<ReturnType<typeof tasksControllerMoveStage>>>;
export type TasksControllerMoveStageMutationBody = MoveTaskStageDto;
export type TasksControllerMoveStageMutationError = unknown;
/**
* @summary Move task stage (admin)
*/
export declare const useTasksControllerMoveStage: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tasksControllerMoveStage>>, TError, {
        id: number;
        data: MoveTaskStageDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof tasksControllerMoveStage>>, TError, {
    id: number;
    data: MoveTaskStageDto;
}, TContext>;
/**
 * @summary Track work session (start, pause, finish)
 */
export type tasksControllerTrackWorkSessionResponse200 = {
    data: TaskDetailDto;
    status: 200;
};
export type tasksControllerTrackWorkSessionResponseSuccess = (tasksControllerTrackWorkSessionResponse200) & {
    headers: Headers;
};
export type tasksControllerTrackWorkSessionResponse = (tasksControllerTrackWorkSessionResponseSuccess);
export declare const getTasksControllerTrackWorkSessionUrl: (id: number) => string;
export declare const tasksControllerTrackWorkSession: (id: number, trackWorkSessionDto: TrackWorkSessionDto, options?: RequestInit) => Promise<tasksControllerTrackWorkSessionResponse>;
export declare const getTasksControllerTrackWorkSessionMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tasksControllerTrackWorkSession>>, TError, {
        id: number;
        data: TrackWorkSessionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof tasksControllerTrackWorkSession>>, TError, {
    id: number;
    data: TrackWorkSessionDto;
}, TContext>;
export type TasksControllerTrackWorkSessionMutationResult = NonNullable<Awaited<ReturnType<typeof tasksControllerTrackWorkSession>>>;
export type TasksControllerTrackWorkSessionMutationBody = TrackWorkSessionDto;
export type TasksControllerTrackWorkSessionMutationError = unknown;
/**
* @summary Track work session (start, pause, finish)
*/
export declare const useTasksControllerTrackWorkSession: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tasksControllerTrackWorkSession>>, TError, {
        id: number;
        data: TrackWorkSessionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof tasksControllerTrackWorkSession>>, TError, {
    id: number;
    data: TrackWorkSessionDto;
}, TContext>;
/**
 * @summary Get employee personal task kanban board
 */
export type myTasksControllerGetBoardResponse200 = {
    data: TaskBoardResultDto;
    status: 200;
};
export type myTasksControllerGetBoardResponseSuccess = (myTasksControllerGetBoardResponse200) & {
    headers: Headers;
};
export type myTasksControllerGetBoardResponse = (myTasksControllerGetBoardResponseSuccess);
export declare const getMyTasksControllerGetBoardUrl: (params?: MyTasksControllerGetBoardParams) => string;
export declare const myTasksControllerGetBoard: (params?: MyTasksControllerGetBoardParams, options?: RequestInit) => Promise<myTasksControllerGetBoardResponse>;
export declare const getMyTasksControllerGetBoardQueryKey: (params?: MyTasksControllerGetBoardParams) => readonly ["/api/v1/my-tasks/board", ...MyTasksControllerGetBoardParams[]];
export declare const getMyTasksControllerGetBoardQueryOptions: <TData = Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError = unknown>(params?: MyTasksControllerGetBoardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type MyTasksControllerGetBoardQueryResult = NonNullable<Awaited<ReturnType<typeof myTasksControllerGetBoard>>>;
export type MyTasksControllerGetBoardQueryError = unknown;
export declare function useMyTasksControllerGetBoard<TData = Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError = unknown>(params: undefined | MyTasksControllerGetBoardParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError, Awaited<ReturnType<typeof myTasksControllerGetBoard>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useMyTasksControllerGetBoard<TData = Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError = unknown>(params?: MyTasksControllerGetBoardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError, Awaited<ReturnType<typeof myTasksControllerGetBoard>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useMyTasksControllerGetBoard<TData = Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError = unknown>(params?: MyTasksControllerGetBoardParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetBoard>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get employee personal task summary metrics
 */
export type myTasksControllerGetSummaryResponse200 = {
    data: TaskSummaryDto;
    status: 200;
};
export type myTasksControllerGetSummaryResponseSuccess = (myTasksControllerGetSummaryResponse200) & {
    headers: Headers;
};
export type myTasksControllerGetSummaryResponse = (myTasksControllerGetSummaryResponseSuccess);
export declare const getMyTasksControllerGetSummaryUrl: () => string;
export declare const myTasksControllerGetSummary: (options?: RequestInit) => Promise<myTasksControllerGetSummaryResponse>;
export declare const getMyTasksControllerGetSummaryQueryKey: () => readonly ["/api/v1/my-tasks/summary"];
export declare const getMyTasksControllerGetSummaryQueryOptions: <TData = Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type MyTasksControllerGetSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof myTasksControllerGetSummary>>>;
export type MyTasksControllerGetSummaryQueryError = unknown;
export declare function useMyTasksControllerGetSummary<TData = Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError, Awaited<ReturnType<typeof myTasksControllerGetSummary>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useMyTasksControllerGetSummary<TData = Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError, Awaited<ReturnType<typeof myTasksControllerGetSummary>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useMyTasksControllerGetSummary<TData = Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSummary>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a quick task for the current employee (Section 3.5 BFD)
 */
export type myTasksControllerCreateQuickTaskResponse201 = {
    data: TaskDetailDto;
    status: 201;
};
export type myTasksControllerCreateQuickTaskResponseSuccess = (myTasksControllerCreateQuickTaskResponse201) & {
    headers: Headers;
};
export type myTasksControllerCreateQuickTaskResponse = (myTasksControllerCreateQuickTaskResponseSuccess);
export declare const getMyTasksControllerCreateQuickTaskUrl: () => string;
export declare const myTasksControllerCreateQuickTask: (createTaskDto: CreateTaskDto, options?: RequestInit) => Promise<myTasksControllerCreateQuickTaskResponse>;
export declare const getMyTasksControllerCreateQuickTaskMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerCreateQuickTask>>, TError, {
        data: CreateTaskDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerCreateQuickTask>>, TError, {
    data: CreateTaskDto;
}, TContext>;
export type MyTasksControllerCreateQuickTaskMutationResult = NonNullable<Awaited<ReturnType<typeof myTasksControllerCreateQuickTask>>>;
export type MyTasksControllerCreateQuickTaskMutationBody = CreateTaskDto;
export type MyTasksControllerCreateQuickTaskMutationError = unknown;
/**
* @summary Create a quick task for the current employee (Section 3.5 BFD)
*/
export declare const useMyTasksControllerCreateQuickTask: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerCreateQuickTask>>, TError, {
        data: CreateTaskDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof myTasksControllerCreateQuickTask>>, TError, {
    data: CreateTaskDto;
}, TContext>;
/**
 * @summary Get details of a task assigned to current employee
 */
export type myTasksControllerGetTaskDetailResponse200 = {
    data: TaskDetailDto;
    status: 200;
};
export type myTasksControllerGetTaskDetailResponseSuccess = (myTasksControllerGetTaskDetailResponse200) & {
    headers: Headers;
};
export type myTasksControllerGetTaskDetailResponse = (myTasksControllerGetTaskDetailResponseSuccess);
export declare const getMyTasksControllerGetTaskDetailUrl: (id: number) => string;
export declare const myTasksControllerGetTaskDetail: (id: number, options?: RequestInit) => Promise<myTasksControllerGetTaskDetailResponse>;
export declare const getMyTasksControllerGetTaskDetailQueryKey: (id?: number) => readonly ["/api/v1/my-tasks/undefined" | `/api/v1/my-tasks/${number}`];
export declare const getMyTasksControllerGetTaskDetailQueryOptions: <TData = Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type MyTasksControllerGetTaskDetailQueryResult = NonNullable<Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>>;
export type MyTasksControllerGetTaskDetailQueryError = unknown;
export declare function useMyTasksControllerGetTaskDetail<TData = Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError, Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useMyTasksControllerGetTaskDetail<TData = Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError, Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useMyTasksControllerGetTaskDetail<TData = Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetTaskDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get sub tasks for a parent task
 */
export type myTasksControllerGetSubTasksResponse200 = {
    data: TaskDetailDto[];
    status: 200;
};
export type myTasksControllerGetSubTasksResponseSuccess = (myTasksControllerGetSubTasksResponse200) & {
    headers: Headers;
};
export type myTasksControllerGetSubTasksResponse = (myTasksControllerGetSubTasksResponseSuccess);
export declare const getMyTasksControllerGetSubTasksUrl: (id: number) => string;
export declare const myTasksControllerGetSubTasks: (id: number, options?: RequestInit) => Promise<myTasksControllerGetSubTasksResponse>;
export declare const getMyTasksControllerGetSubTasksQueryKey: (id?: number) => readonly ["/api/v1/my-tasks/undefined/subtasks" | `/api/v1/my-tasks/${number}/subtasks`];
export declare const getMyTasksControllerGetSubTasksQueryOptions: <TData = Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type MyTasksControllerGetSubTasksQueryResult = NonNullable<Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>>;
export type MyTasksControllerGetSubTasksQueryError = unknown;
export declare function useMyTasksControllerGetSubTasks<TData = Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError, Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useMyTasksControllerGetSubTasks<TData = Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError, Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useMyTasksControllerGetSubTasks<TData = Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof myTasksControllerGetSubTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Move assigned task stage (e.g. to in_progress, hold, or requested)
 */
export type myTasksControllerMoveStageResponse200 = {
    data: TaskDetailDto;
    status: 200;
};
export type myTasksControllerMoveStageResponseSuccess = (myTasksControllerMoveStageResponse200) & {
    headers: Headers;
};
export type myTasksControllerMoveStageResponse = (myTasksControllerMoveStageResponseSuccess);
export declare const getMyTasksControllerMoveStageUrl: (id: number) => string;
export declare const myTasksControllerMoveStage: (id: number, moveTaskStageDto: MoveTaskStageDto, options?: RequestInit) => Promise<myTasksControllerMoveStageResponse>;
export declare const getMyTasksControllerMoveStageMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerMoveStage>>, TError, {
        id: number;
        data: MoveTaskStageDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerMoveStage>>, TError, {
    id: number;
    data: MoveTaskStageDto;
}, TContext>;
export type MyTasksControllerMoveStageMutationResult = NonNullable<Awaited<ReturnType<typeof myTasksControllerMoveStage>>>;
export type MyTasksControllerMoveStageMutationBody = MoveTaskStageDto;
export type MyTasksControllerMoveStageMutationError = unknown;
/**
* @summary Move assigned task stage (e.g. to in_progress, hold, or requested)
*/
export declare const useMyTasksControllerMoveStage: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerMoveStage>>, TError, {
        id: number;
        data: MoveTaskStageDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof myTasksControllerMoveStage>>, TError, {
    id: number;
    data: MoveTaskStageDto;
}, TContext>;
/**
 * @summary Track work session (start, pause, finish)
 */
export type myTasksControllerTrackWorkSessionResponse200 = {
    data: TaskDetailDto;
    status: 200;
};
export type myTasksControllerTrackWorkSessionResponseSuccess = (myTasksControllerTrackWorkSessionResponse200) & {
    headers: Headers;
};
export type myTasksControllerTrackWorkSessionResponse = (myTasksControllerTrackWorkSessionResponseSuccess);
export declare const getMyTasksControllerTrackWorkSessionUrl: (id: number) => string;
export declare const myTasksControllerTrackWorkSession: (id: number, trackWorkSessionDto: TrackWorkSessionDto, options?: RequestInit) => Promise<myTasksControllerTrackWorkSessionResponse>;
export declare const getMyTasksControllerTrackWorkSessionMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerTrackWorkSession>>, TError, {
        id: number;
        data: TrackWorkSessionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerTrackWorkSession>>, TError, {
    id: number;
    data: TrackWorkSessionDto;
}, TContext>;
export type MyTasksControllerTrackWorkSessionMutationResult = NonNullable<Awaited<ReturnType<typeof myTasksControllerTrackWorkSession>>>;
export type MyTasksControllerTrackWorkSessionMutationBody = TrackWorkSessionDto;
export type MyTasksControllerTrackWorkSessionMutationError = unknown;
/**
* @summary Track work session (start, pause, finish)
*/
export declare const useMyTasksControllerTrackWorkSession: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof myTasksControllerTrackWorkSession>>, TError, {
        id: number;
        data: TrackWorkSessionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof myTasksControllerTrackWorkSession>>, TError, {
    id: number;
    data: TrackWorkSessionDto;
}, TContext>;
/**
 * @summary Get calendar events in time window for current employee or all if admin
 */
export type calendarControllerGetEventsResponse200 = {
    data: CalendarEventResponseDto[];
    status: 200;
};
export type calendarControllerGetEventsResponseSuccess = (calendarControllerGetEventsResponse200) & {
    headers: Headers;
};
export type calendarControllerGetEventsResponse = (calendarControllerGetEventsResponseSuccess);
export declare const getCalendarControllerGetEventsUrl: (params: CalendarControllerGetEventsParams) => string;
export declare const calendarControllerGetEvents: (params: CalendarControllerGetEventsParams, options?: RequestInit) => Promise<calendarControllerGetEventsResponse>;
export declare const getCalendarControllerGetEventsQueryKey: (params?: CalendarControllerGetEventsParams) => readonly ["/api/v1/calendar/events", ...CalendarControllerGetEventsParams[]];
export declare const getCalendarControllerGetEventsQueryOptions: <TData = Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError = unknown>(params: CalendarControllerGetEventsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CalendarControllerGetEventsQueryResult = NonNullable<Awaited<ReturnType<typeof calendarControllerGetEvents>>>;
export type CalendarControllerGetEventsQueryError = unknown;
export declare function useCalendarControllerGetEvents<TData = Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError = unknown>(params: CalendarControllerGetEventsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError, Awaited<ReturnType<typeof calendarControllerGetEvents>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetEvents<TData = Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError = unknown>(params: CalendarControllerGetEventsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError, Awaited<ReturnType<typeof calendarControllerGetEvents>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetEvents<TData = Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError = unknown>(params: CalendarControllerGetEventsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetEvents>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a meeting or task time-block
 */
export type calendarControllerCreateEventResponse201 = {
    data: CalendarEventResponseDto;
    status: 201;
};
export type calendarControllerCreateEventResponseSuccess = (calendarControllerCreateEventResponse201) & {
    headers: Headers;
};
export type calendarControllerCreateEventResponse = (calendarControllerCreateEventResponseSuccess);
export declare const getCalendarControllerCreateEventUrl: () => string;
export declare const calendarControllerCreateEvent: (createCalendarEventDto: CreateCalendarEventDto, options?: RequestInit) => Promise<calendarControllerCreateEventResponse>;
export declare const getCalendarControllerCreateEventMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calendarControllerCreateEvent>>, TError, {
        data: CreateCalendarEventDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof calendarControllerCreateEvent>>, TError, {
    data: CreateCalendarEventDto;
}, TContext>;
export type CalendarControllerCreateEventMutationResult = NonNullable<Awaited<ReturnType<typeof calendarControllerCreateEvent>>>;
export type CalendarControllerCreateEventMutationBody = CreateCalendarEventDto;
export type CalendarControllerCreateEventMutationError = unknown;
/**
* @summary Create a meeting or task time-block
*/
export declare const useCalendarControllerCreateEvent: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calendarControllerCreateEvent>>, TError, {
        data: CreateCalendarEventDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof calendarControllerCreateEvent>>, TError, {
    data: CreateCalendarEventDto;
}, TContext>;
/**
 * @summary Update an existing calendar event
 */
export type calendarControllerUpdateEventResponse200 = {
    data: CalendarEventResponseDto;
    status: 200;
};
export type calendarControllerUpdateEventResponseSuccess = (calendarControllerUpdateEventResponse200) & {
    headers: Headers;
};
export type calendarControllerUpdateEventResponse = (calendarControllerUpdateEventResponseSuccess);
export declare const getCalendarControllerUpdateEventUrl: (id: number) => string;
export declare const calendarControllerUpdateEvent: (id: number, updateCalendarEventDto: UpdateCalendarEventDto, options?: RequestInit) => Promise<calendarControllerUpdateEventResponse>;
export declare const getCalendarControllerUpdateEventMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calendarControllerUpdateEvent>>, TError, {
        id: number;
        data: UpdateCalendarEventDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof calendarControllerUpdateEvent>>, TError, {
    id: number;
    data: UpdateCalendarEventDto;
}, TContext>;
export type CalendarControllerUpdateEventMutationResult = NonNullable<Awaited<ReturnType<typeof calendarControllerUpdateEvent>>>;
export type CalendarControllerUpdateEventMutationBody = UpdateCalendarEventDto;
export type CalendarControllerUpdateEventMutationError = unknown;
/**
* @summary Update an existing calendar event
*/
export declare const useCalendarControllerUpdateEvent: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calendarControllerUpdateEvent>>, TError, {
        id: number;
        data: UpdateCalendarEventDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof calendarControllerUpdateEvent>>, TError, {
    id: number;
    data: UpdateCalendarEventDto;
}, TContext>;
/**
 * @summary Delete (soft-delete) a calendar event
 */
export type calendarControllerDeleteEventResponse204 = {
    data: void;
    status: 204;
};
export type calendarControllerDeleteEventResponseSuccess = (calendarControllerDeleteEventResponse204) & {
    headers: Headers;
};
export type calendarControllerDeleteEventResponse = (calendarControllerDeleteEventResponseSuccess);
export declare const getCalendarControllerDeleteEventUrl: (id: number) => string;
export declare const calendarControllerDeleteEvent: (id: number, options?: RequestInit) => Promise<calendarControllerDeleteEventResponse>;
export declare const getCalendarControllerDeleteEventMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calendarControllerDeleteEvent>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof calendarControllerDeleteEvent>>, TError, {
    id: number;
}, TContext>;
export type CalendarControllerDeleteEventMutationResult = NonNullable<Awaited<ReturnType<typeof calendarControllerDeleteEvent>>>;
export type CalendarControllerDeleteEventMutationError = unknown;
/**
* @summary Delete (soft-delete) a calendar event
*/
export declare const useCalendarControllerDeleteEvent: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calendarControllerDeleteEvent>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof calendarControllerDeleteEvent>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Respond to a meeting invitation (accept, decline, tentative)
 */
export type calendarControllerRespondRsvpResponse200 = {
    data: void;
    status: 200;
};
export type calendarControllerRespondRsvpResponseSuccess = (calendarControllerRespondRsvpResponse200) & {
    headers: Headers;
};
export type calendarControllerRespondRsvpResponse = (calendarControllerRespondRsvpResponseSuccess);
export declare const getCalendarControllerRespondRsvpUrl: (id: number) => string;
export declare const calendarControllerRespondRsvp: (id: number, respondRsvpDto: RespondRsvpDto, options?: RequestInit) => Promise<calendarControllerRespondRsvpResponse>;
export declare const getCalendarControllerRespondRsvpMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calendarControllerRespondRsvp>>, TError, {
        id: number;
        data: RespondRsvpDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof calendarControllerRespondRsvp>>, TError, {
    id: number;
    data: RespondRsvpDto;
}, TContext>;
export type CalendarControllerRespondRsvpMutationResult = NonNullable<Awaited<ReturnType<typeof calendarControllerRespondRsvp>>>;
export type CalendarControllerRespondRsvpMutationBody = RespondRsvpDto;
export type CalendarControllerRespondRsvpMutationError = unknown;
/**
* @summary Respond to a meeting invitation (accept, decline, tentative)
*/
export declare const useCalendarControllerRespondRsvp: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calendarControllerRespondRsvp>>, TError, {
        id: number;
        data: RespondRsvpDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof calendarControllerRespondRsvp>>, TError, {
    id: number;
    data: RespondRsvpDto;
}, TContext>;
/**
 * @summary Get active tasks ready for time-blocking on calendar
 */
export type calendarControllerGetUnscheduledTasksResponse200 = {
    data: UnscheduledTaskDto[];
    status: 200;
};
export type calendarControllerGetUnscheduledTasksResponseSuccess = (calendarControllerGetUnscheduledTasksResponse200) & {
    headers: Headers;
};
export type calendarControllerGetUnscheduledTasksResponse = (calendarControllerGetUnscheduledTasksResponseSuccess);
export declare const getCalendarControllerGetUnscheduledTasksUrl: () => string;
export declare const calendarControllerGetUnscheduledTasks: (options?: RequestInit) => Promise<calendarControllerGetUnscheduledTasksResponse>;
export declare const getCalendarControllerGetUnscheduledTasksQueryKey: () => readonly ["/api/v1/calendar/unscheduled-tasks"];
export declare const getCalendarControllerGetUnscheduledTasksQueryOptions: <TData = Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CalendarControllerGetUnscheduledTasksQueryResult = NonNullable<Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>>;
export type CalendarControllerGetUnscheduledTasksQueryError = unknown;
export declare function useCalendarControllerGetUnscheduledTasks<TData = Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError, Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetUnscheduledTasks<TData = Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError, Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetUnscheduledTasks<TData = Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetUnscheduledTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get completed and submitted tasks for calendar month view
 */
export type calendarControllerGetMonthTasksResponse200 = {
    data: void;
    status: 200;
};
export type calendarControllerGetMonthTasksResponseSuccess = (calendarControllerGetMonthTasksResponse200) & {
    headers: Headers;
};
export type calendarControllerGetMonthTasksResponse = (calendarControllerGetMonthTasksResponseSuccess);
export declare const getCalendarControllerGetMonthTasksUrl: (params: CalendarControllerGetMonthTasksParams) => string;
export declare const calendarControllerGetMonthTasks: (params: CalendarControllerGetMonthTasksParams, options?: RequestInit) => Promise<calendarControllerGetMonthTasksResponse>;
export declare const getCalendarControllerGetMonthTasksQueryKey: (params?: CalendarControllerGetMonthTasksParams) => readonly ["/api/v1/calendar/month-tasks", ...CalendarControllerGetMonthTasksParams[]];
export declare const getCalendarControllerGetMonthTasksQueryOptions: <TData = Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError = unknown>(params: CalendarControllerGetMonthTasksParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CalendarControllerGetMonthTasksQueryResult = NonNullable<Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>>;
export type CalendarControllerGetMonthTasksQueryError = unknown;
export declare function useCalendarControllerGetMonthTasks<TData = Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError = unknown>(params: CalendarControllerGetMonthTasksParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError, Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetMonthTasks<TData = Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError = unknown>(params: CalendarControllerGetMonthTasksParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError, Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetMonthTasks<TData = Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError = unknown>(params: CalendarControllerGetMonthTasksParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetMonthTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get calendar 4 KPI summary cards for month
 */
export type calendarControllerGetSummaryResponse200 = {
    data: void;
    status: 200;
};
export type calendarControllerGetSummaryResponseSuccess = (calendarControllerGetSummaryResponse200) & {
    headers: Headers;
};
export type calendarControllerGetSummaryResponse = (calendarControllerGetSummaryResponseSuccess);
export declare const getCalendarControllerGetSummaryUrl: (params: CalendarControllerGetSummaryParams) => string;
export declare const calendarControllerGetSummary: (params: CalendarControllerGetSummaryParams, options?: RequestInit) => Promise<calendarControllerGetSummaryResponse>;
export declare const getCalendarControllerGetSummaryQueryKey: (params?: CalendarControllerGetSummaryParams) => readonly ["/api/v1/calendar/summary", ...CalendarControllerGetSummaryParams[]];
export declare const getCalendarControllerGetSummaryQueryOptions: <TData = Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError = unknown>(params: CalendarControllerGetSummaryParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CalendarControllerGetSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof calendarControllerGetSummary>>>;
export type CalendarControllerGetSummaryQueryError = unknown;
export declare function useCalendarControllerGetSummary<TData = Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError = unknown>(params: CalendarControllerGetSummaryParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError, Awaited<ReturnType<typeof calendarControllerGetSummary>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetSummary<TData = Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError = unknown>(params: CalendarControllerGetSummaryParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError, Awaited<ReturnType<typeof calendarControllerGetSummary>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetSummary<TData = Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError = unknown>(params: CalendarControllerGetSummaryParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetSummary>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get holidays for calendar range
 */
export type calendarControllerGetHolidaysResponse200 = {
    data: void;
    status: 200;
};
export type calendarControllerGetHolidaysResponseSuccess = (calendarControllerGetHolidaysResponse200) & {
    headers: Headers;
};
export type calendarControllerGetHolidaysResponse = (calendarControllerGetHolidaysResponseSuccess);
export declare const getCalendarControllerGetHolidaysUrl: (params: CalendarControllerGetHolidaysParams) => string;
export declare const calendarControllerGetHolidays: (params: CalendarControllerGetHolidaysParams, options?: RequestInit) => Promise<calendarControllerGetHolidaysResponse>;
export declare const getCalendarControllerGetHolidaysQueryKey: (params?: CalendarControllerGetHolidaysParams) => readonly ["/api/v1/calendar/holidays", ...CalendarControllerGetHolidaysParams[]];
export declare const getCalendarControllerGetHolidaysQueryOptions: <TData = Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError = unknown>(params: CalendarControllerGetHolidaysParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type CalendarControllerGetHolidaysQueryResult = NonNullable<Awaited<ReturnType<typeof calendarControllerGetHolidays>>>;
export type CalendarControllerGetHolidaysQueryError = unknown;
export declare function useCalendarControllerGetHolidays<TData = Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError = unknown>(params: CalendarControllerGetHolidaysParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError, Awaited<ReturnType<typeof calendarControllerGetHolidays>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetHolidays<TData = Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError = unknown>(params: CalendarControllerGetHolidaysParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError, Awaited<ReturnType<typeof calendarControllerGetHolidays>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useCalendarControllerGetHolidays<TData = Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError = unknown>(params: CalendarControllerGetHolidaysParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof calendarControllerGetHolidays>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get projects with filtering and role-based scope
 */
export type projectsControllerGetProjectsResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetProjectsResponseSuccess = (projectsControllerGetProjectsResponse200) & {
    headers: Headers;
};
export type projectsControllerGetProjectsResponse = (projectsControllerGetProjectsResponseSuccess);
export declare const getProjectsControllerGetProjectsUrl: (params?: ProjectsControllerGetProjectsParams) => string;
export declare const projectsControllerGetProjects: (params?: ProjectsControllerGetProjectsParams, options?: RequestInit) => Promise<projectsControllerGetProjectsResponse>;
export declare const getProjectsControllerGetProjectsQueryKey: (params?: ProjectsControllerGetProjectsParams) => readonly ["/api/v1/projects", ...ProjectsControllerGetProjectsParams[]];
export declare const getProjectsControllerGetProjectsQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError = unknown>(params?: ProjectsControllerGetProjectsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetProjectsQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetProjects>>>;
export type ProjectsControllerGetProjectsQueryError = unknown;
export declare function useProjectsControllerGetProjects<TData = Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError = unknown>(params: undefined | ProjectsControllerGetProjectsParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjects>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjects<TData = Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError = unknown>(params?: ProjectsControllerGetProjectsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjects>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjects<TData = Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError = unknown>(params?: ProjectsControllerGetProjectsParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjects>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a new project (Admin only)
 */
export type projectsControllerCreateProjectResponse201 = {
    data: void;
    status: 201;
};
export type projectsControllerCreateProjectResponseSuccess = (projectsControllerCreateProjectResponse201) & {
    headers: Headers;
};
export type projectsControllerCreateProjectResponse = (projectsControllerCreateProjectResponseSuccess);
export declare const getProjectsControllerCreateProjectUrl: () => string;
export declare const projectsControllerCreateProject: (createProjectDto: CreateProjectDto, options?: RequestInit) => Promise<projectsControllerCreateProjectResponse>;
export declare const getProjectsControllerCreateProjectMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProject>>, TError, {
        data: CreateProjectDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProject>>, TError, {
    data: CreateProjectDto;
}, TContext>;
export type ProjectsControllerCreateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerCreateProject>>>;
export type ProjectsControllerCreateProjectMutationBody = CreateProjectDto;
export type ProjectsControllerCreateProjectMutationError = unknown;
/**
* @summary Create a new project (Admin only)
*/
export declare const useProjectsControllerCreateProject: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProject>>, TError, {
        data: CreateProjectDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerCreateProject>>, TError, {
    data: CreateProjectDto;
}, TContext>;
/**
 * @summary Get active employees assignable as PM or team members
 */
export type projectsControllerGetAssignableEmployeesResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetAssignableEmployeesResponseSuccess = (projectsControllerGetAssignableEmployeesResponse200) & {
    headers: Headers;
};
export type projectsControllerGetAssignableEmployeesResponse = (projectsControllerGetAssignableEmployeesResponseSuccess);
export declare const getProjectsControllerGetAssignableEmployeesUrl: () => string;
export declare const projectsControllerGetAssignableEmployees: (options?: RequestInit) => Promise<projectsControllerGetAssignableEmployeesResponse>;
export declare const getProjectsControllerGetAssignableEmployeesQueryKey: () => readonly ["/api/v1/projects/assignable-employees"];
export declare const getProjectsControllerGetAssignableEmployeesQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetAssignableEmployeesQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>>;
export type ProjectsControllerGetAssignableEmployeesQueryError = unknown;
export declare function useProjectsControllerGetAssignableEmployees<TData = Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError = unknown>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError, Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetAssignableEmployees<TData = Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError, Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetAssignableEmployees<TData = Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError = unknown>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetAssignableEmployees>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get project details by ID
 */
export type projectsControllerGetProjectDetailResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetProjectDetailResponseSuccess = (projectsControllerGetProjectDetailResponse200) & {
    headers: Headers;
};
export type projectsControllerGetProjectDetailResponse = (projectsControllerGetProjectDetailResponseSuccess);
export declare const getProjectsControllerGetProjectDetailUrl: (id: number) => string;
export declare const projectsControllerGetProjectDetail: (id: number, options?: RequestInit) => Promise<projectsControllerGetProjectDetailResponse>;
export declare const getProjectsControllerGetProjectDetailQueryKey: (id?: number) => readonly ["/api/v1/projects/undefined" | `/api/v1/projects/${number}`];
export declare const getProjectsControllerGetProjectDetailQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetProjectDetailQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>>;
export type ProjectsControllerGetProjectDetailQueryError = unknown;
export declare function useProjectsControllerGetProjectDetail<TData = Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectDetail<TData = Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectDetail<TData = Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update project details (Admin and Project Manager)
 */
export type projectsControllerUpdateProjectResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerUpdateProjectResponseSuccess = (projectsControllerUpdateProjectResponse200) & {
    headers: Headers;
};
export type projectsControllerUpdateProjectResponse = (projectsControllerUpdateProjectResponseSuccess);
export declare const getProjectsControllerUpdateProjectUrl: (id: number) => string;
export declare const projectsControllerUpdateProject: (id: number, updateProjectDto: UpdateProjectDto, options?: RequestInit) => Promise<projectsControllerUpdateProjectResponse>;
export declare const getProjectsControllerUpdateProjectMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProject>>, TError, {
        id: number;
        data: UpdateProjectDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProject>>, TError, {
    id: number;
    data: UpdateProjectDto;
}, TContext>;
export type ProjectsControllerUpdateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerUpdateProject>>>;
export type ProjectsControllerUpdateProjectMutationBody = UpdateProjectDto;
export type ProjectsControllerUpdateProjectMutationError = unknown;
/**
* @summary Update project details (Admin and Project Manager)
*/
export declare const useProjectsControllerUpdateProject: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProject>>, TError, {
        id: number;
        data: UpdateProjectDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerUpdateProject>>, TError, {
    id: number;
    data: UpdateProjectDto;
}, TContext>;
/**
 * @summary Update project status (Admin and Project Manager)
 */
export type projectsControllerUpdateProjectStatusResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerUpdateProjectStatusResponseSuccess = (projectsControllerUpdateProjectStatusResponse200) & {
    headers: Headers;
};
export type projectsControllerUpdateProjectStatusResponse = (projectsControllerUpdateProjectStatusResponseSuccess);
export declare const getProjectsControllerUpdateProjectStatusUrl: (id: number) => string;
export declare const projectsControllerUpdateProjectStatus: (id: number, updateProjectStatusDto: UpdateProjectStatusDto, options?: RequestInit) => Promise<projectsControllerUpdateProjectStatusResponse>;
export declare const getProjectsControllerUpdateProjectStatusMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProjectStatus>>, TError, {
        id: number;
        data: UpdateProjectStatusDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProjectStatus>>, TError, {
    id: number;
    data: UpdateProjectStatusDto;
}, TContext>;
export type ProjectsControllerUpdateProjectStatusMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerUpdateProjectStatus>>>;
export type ProjectsControllerUpdateProjectStatusMutationBody = UpdateProjectStatusDto;
export type ProjectsControllerUpdateProjectStatusMutationError = unknown;
/**
* @summary Update project status (Admin and Project Manager)
*/
export declare const useProjectsControllerUpdateProjectStatus: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProjectStatus>>, TError, {
        id: number;
        data: UpdateProjectStatusDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerUpdateProjectStatus>>, TError, {
    id: number;
    data: UpdateProjectStatusDto;
}, TContext>;
/**
 * @summary Get all sprints for a project
 */
export type projectsControllerGetProjectSprintsResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetProjectSprintsResponseSuccess = (projectsControllerGetProjectSprintsResponse200) & {
    headers: Headers;
};
export type projectsControllerGetProjectSprintsResponse = (projectsControllerGetProjectSprintsResponseSuccess);
export declare const getProjectsControllerGetProjectSprintsUrl: (id: number) => string;
export declare const projectsControllerGetProjectSprints: (id: number, options?: RequestInit) => Promise<projectsControllerGetProjectSprintsResponse>;
export declare const getProjectsControllerGetProjectSprintsQueryKey: (id?: number) => readonly ["/api/v1/projects/undefined/sprints" | `/api/v1/projects/${number}/sprints`];
export declare const getProjectsControllerGetProjectSprintsQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetProjectSprintsQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>>;
export type ProjectsControllerGetProjectSprintsQueryError = unknown;
export declare function useProjectsControllerGetProjectSprints<TData = Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectSprints<TData = Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectSprints<TData = Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectSprints>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a new sprint for a project (Admin and PM)
 */
export type projectsControllerCreateSprintResponse201 = {
    data: void;
    status: 201;
};
export type projectsControllerCreateSprintResponseSuccess = (projectsControllerCreateSprintResponse201) & {
    headers: Headers;
};
export type projectsControllerCreateSprintResponse = (projectsControllerCreateSprintResponseSuccess);
export declare const getProjectsControllerCreateSprintUrl: (id: number) => string;
export declare const projectsControllerCreateSprint: (id: number, createSprintDto: CreateSprintDto, options?: RequestInit) => Promise<projectsControllerCreateSprintResponse>;
export declare const getProjectsControllerCreateSprintMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateSprint>>, TError, {
        id: number;
        data: CreateSprintDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateSprint>>, TError, {
    id: number;
    data: CreateSprintDto;
}, TContext>;
export type ProjectsControllerCreateSprintMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerCreateSprint>>>;
export type ProjectsControllerCreateSprintMutationBody = CreateSprintDto;
export type ProjectsControllerCreateSprintMutationError = unknown;
/**
* @summary Create a new sprint for a project (Admin and PM)
*/
export declare const useProjectsControllerCreateSprint: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateSprint>>, TError, {
        id: number;
        data: CreateSprintDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerCreateSprint>>, TError, {
    id: number;
    data: CreateSprintDto;
}, TContext>;
/**
 * @summary Update sprint details or status
 */
export type projectsControllerUpdateSprintResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerUpdateSprintResponseSuccess = (projectsControllerUpdateSprintResponse200) & {
    headers: Headers;
};
export type projectsControllerUpdateSprintResponse = (projectsControllerUpdateSprintResponseSuccess);
export declare const getProjectsControllerUpdateSprintUrl: (id: number, sprintId: number) => string;
export declare const projectsControllerUpdateSprint: (id: number, sprintId: number, updateSprintDto: UpdateSprintDto, options?: RequestInit) => Promise<projectsControllerUpdateSprintResponse>;
export declare const getProjectsControllerUpdateSprintMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateSprint>>, TError, {
        id: number;
        sprintId: number;
        data: UpdateSprintDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateSprint>>, TError, {
    id: number;
    sprintId: number;
    data: UpdateSprintDto;
}, TContext>;
export type ProjectsControllerUpdateSprintMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerUpdateSprint>>>;
export type ProjectsControllerUpdateSprintMutationBody = UpdateSprintDto;
export type ProjectsControllerUpdateSprintMutationError = unknown;
/**
* @summary Update sprint details or status
*/
export declare const useProjectsControllerUpdateSprint: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateSprint>>, TError, {
        id: number;
        sprintId: number;
        data: UpdateSprintDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerUpdateSprint>>, TError, {
    id: number;
    sprintId: number;
    data: UpdateSprintDto;
}, TContext>;
/**
 * @summary Get project tasks (optionally filtered by sprint_id)
 */
export type projectsControllerGetProjectTasksResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetProjectTasksResponseSuccess = (projectsControllerGetProjectTasksResponse200) & {
    headers: Headers;
};
export type projectsControllerGetProjectTasksResponse = (projectsControllerGetProjectTasksResponseSuccess);
export declare const getProjectsControllerGetProjectTasksUrl: (id: number, params: ProjectsControllerGetProjectTasksParams) => string;
export declare const projectsControllerGetProjectTasks: (id: number, params: ProjectsControllerGetProjectTasksParams, options?: RequestInit) => Promise<projectsControllerGetProjectTasksResponse>;
export declare const getProjectsControllerGetProjectTasksQueryKey: (id?: number, params?: ProjectsControllerGetProjectTasksParams) => readonly ["/api/v1/projects/undefined/tasks" | `/api/v1/projects/${number}/tasks`, ...ProjectsControllerGetProjectTasksParams[]];
export declare const getProjectsControllerGetProjectTasksQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError = unknown>(id: number, params: ProjectsControllerGetProjectTasksParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetProjectTasksQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>>;
export type ProjectsControllerGetProjectTasksQueryError = unknown;
export declare function useProjectsControllerGetProjectTasks<TData = Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError = unknown>(id: number, params: ProjectsControllerGetProjectTasksParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectTasks<TData = Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError = unknown>(id: number, params: ProjectsControllerGetProjectTasksParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectTasks<TData = Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError = unknown>(id: number, params: ProjectsControllerGetProjectTasksParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectTasks>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Create a task under this project and optional sprint
 */
export type projectsControllerCreateProjectTaskResponse201 = {
    data: void;
    status: 201;
};
export type projectsControllerCreateProjectTaskResponseSuccess = (projectsControllerCreateProjectTaskResponse201) & {
    headers: Headers;
};
export type projectsControllerCreateProjectTaskResponse = (projectsControllerCreateProjectTaskResponseSuccess);
export declare const getProjectsControllerCreateProjectTaskUrl: (id: number) => string;
export declare const projectsControllerCreateProjectTask: (id: number, createProjectTaskDto: CreateProjectTaskDto, options?: RequestInit) => Promise<projectsControllerCreateProjectTaskResponse>;
export declare const getProjectsControllerCreateProjectTaskMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectTask>>, TError, {
        id: number;
        data: CreateProjectTaskDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectTask>>, TError, {
    id: number;
    data: CreateProjectTaskDto;
}, TContext>;
export type ProjectsControllerCreateProjectTaskMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerCreateProjectTask>>>;
export type ProjectsControllerCreateProjectTaskMutationBody = CreateProjectTaskDto;
export type ProjectsControllerCreateProjectTaskMutationError = unknown;
/**
* @summary Create a task under this project and optional sprint
*/
export declare const useProjectsControllerCreateProjectTask: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectTask>>, TError, {
        id: number;
        data: CreateProjectTaskDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerCreateProjectTask>>, TError, {
    id: number;
    data: CreateProjectTaskDto;
}, TContext>;
/**
 * @summary Get discussion messages for a project
 */
export type projectsControllerGetProjectDiscussionsResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetProjectDiscussionsResponseSuccess = (projectsControllerGetProjectDiscussionsResponse200) & {
    headers: Headers;
};
export type projectsControllerGetProjectDiscussionsResponse = (projectsControllerGetProjectDiscussionsResponseSuccess);
export declare const getProjectsControllerGetProjectDiscussionsUrl: (id: number) => string;
export declare const projectsControllerGetProjectDiscussions: (id: number, options?: RequestInit) => Promise<projectsControllerGetProjectDiscussionsResponse>;
export declare const getProjectsControllerGetProjectDiscussionsQueryKey: (id?: number) => readonly ["/api/v1/projects/undefined/discussions" | `/api/v1/projects/${number}/discussions`];
export declare const getProjectsControllerGetProjectDiscussionsQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetProjectDiscussionsQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>>;
export type ProjectsControllerGetProjectDiscussionsQueryError = unknown;
export declare function useProjectsControllerGetProjectDiscussions<TData = Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectDiscussions<TData = Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectDiscussions<TData = Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectDiscussions>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Post a discussion message to a project
 */
export type projectsControllerCreateProjectDiscussionResponse201 = {
    data: void;
    status: 201;
};
export type projectsControllerCreateProjectDiscussionResponseSuccess = (projectsControllerCreateProjectDiscussionResponse201) & {
    headers: Headers;
};
export type projectsControllerCreateProjectDiscussionResponse = (projectsControllerCreateProjectDiscussionResponseSuccess);
export declare const getProjectsControllerCreateProjectDiscussionUrl: (id: number) => string;
export declare const projectsControllerCreateProjectDiscussion: (id: number, createDiscussionDto: CreateDiscussionDto, options?: RequestInit) => Promise<projectsControllerCreateProjectDiscussionResponse>;
export declare const getProjectsControllerCreateProjectDiscussionMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectDiscussion>>, TError, {
        id: number;
        data: CreateDiscussionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectDiscussion>>, TError, {
    id: number;
    data: CreateDiscussionDto;
}, TContext>;
export type ProjectsControllerCreateProjectDiscussionMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerCreateProjectDiscussion>>>;
export type ProjectsControllerCreateProjectDiscussionMutationBody = CreateDiscussionDto;
export type ProjectsControllerCreateProjectDiscussionMutationError = unknown;
/**
* @summary Post a discussion message to a project
*/
export declare const useProjectsControllerCreateProjectDiscussion: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectDiscussion>>, TError, {
        id: number;
        data: CreateDiscussionDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerCreateProjectDiscussion>>, TError, {
    id: number;
    data: CreateDiscussionDto;
}, TContext>;
/**
 * @summary Get activity logs for a project
 */
export type projectsControllerGetProjectActivityLogsResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetProjectActivityLogsResponseSuccess = (projectsControllerGetProjectActivityLogsResponse200) & {
    headers: Headers;
};
export type projectsControllerGetProjectActivityLogsResponse = (projectsControllerGetProjectActivityLogsResponseSuccess);
export declare const getProjectsControllerGetProjectActivityLogsUrl: (id: number) => string;
export declare const projectsControllerGetProjectActivityLogs: (id: number, options?: RequestInit) => Promise<projectsControllerGetProjectActivityLogsResponse>;
export declare const getProjectsControllerGetProjectActivityLogsQueryKey: (id?: number) => readonly ["/api/v1/projects/undefined/activity-logs" | `/api/v1/projects/${number}/activity-logs`];
export declare const getProjectsControllerGetProjectActivityLogsQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetProjectActivityLogsQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>>;
export type ProjectsControllerGetProjectActivityLogsQueryError = unknown;
export declare function useProjectsControllerGetProjectActivityLogs<TData = Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectActivityLogs<TData = Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectActivityLogs<TData = Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectActivityLogs>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Get bugs for a project
 */
export type projectsControllerGetProjectBugsResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetProjectBugsResponseSuccess = (projectsControllerGetProjectBugsResponse200) & {
    headers: Headers;
};
export type projectsControllerGetProjectBugsResponse = (projectsControllerGetProjectBugsResponseSuccess);
export declare const getProjectsControllerGetProjectBugsUrl: (id: number) => string;
export declare const projectsControllerGetProjectBugs: (id: number, options?: RequestInit) => Promise<projectsControllerGetProjectBugsResponse>;
export declare const getProjectsControllerGetProjectBugsQueryKey: (id?: number) => readonly ["/api/v1/projects/undefined/bugs" | `/api/v1/projects/${number}/bugs`];
export declare const getProjectsControllerGetProjectBugsQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetProjectBugsQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>>;
export type ProjectsControllerGetProjectBugsQueryError = unknown;
export declare function useProjectsControllerGetProjectBugs<TData = Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError = unknown>(id: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectBugs<TData = Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectBugs<TData = Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError = unknown>(id: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugs>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Report a bug for a project
 */
export type projectsControllerCreateProjectBugResponse201 = {
    data: void;
    status: 201;
};
export type projectsControllerCreateProjectBugResponseSuccess = (projectsControllerCreateProjectBugResponse201) & {
    headers: Headers;
};
export type projectsControllerCreateProjectBugResponse = (projectsControllerCreateProjectBugResponseSuccess);
export declare const getProjectsControllerCreateProjectBugUrl: (id: number) => string;
export declare const projectsControllerCreateProjectBug: (id: number, createBugDto: CreateBugDto, options?: RequestInit) => Promise<projectsControllerCreateProjectBugResponse>;
export declare const getProjectsControllerCreateProjectBugMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectBug>>, TError, {
        id: number;
        data: CreateBugDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectBug>>, TError, {
    id: number;
    data: CreateBugDto;
}, TContext>;
export type ProjectsControllerCreateProjectBugMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerCreateProjectBug>>>;
export type ProjectsControllerCreateProjectBugMutationBody = CreateBugDto;
export type ProjectsControllerCreateProjectBugMutationError = unknown;
/**
* @summary Report a bug for a project
*/
export declare const useProjectsControllerCreateProjectBug: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerCreateProjectBug>>, TError, {
        id: number;
        data: CreateBugDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerCreateProjectBug>>, TError, {
    id: number;
    data: CreateBugDto;
}, TContext>;
/**
 * @summary Get bug details including time tracking, comments, and history
 */
export type projectsControllerGetProjectBugDetailResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerGetProjectBugDetailResponseSuccess = (projectsControllerGetProjectBugDetailResponse200) & {
    headers: Headers;
};
export type projectsControllerGetProjectBugDetailResponse = (projectsControllerGetProjectBugDetailResponseSuccess);
export declare const getProjectsControllerGetProjectBugDetailUrl: (id: number, bugId: number) => string;
export declare const projectsControllerGetProjectBugDetail: (id: number, bugId: number, options?: RequestInit) => Promise<projectsControllerGetProjectBugDetailResponse>;
export declare const getProjectsControllerGetProjectBugDetailQueryKey: (id?: number, bugId?: number) => readonly ["/api/v1/projects/undefined/bugs/undefined" | `/api/v1/projects/undefined/bugs/${number}` | `/api/v1/projects/${number}/bugs/undefined` | `/api/v1/projects/${number}/bugs/${number}`];
export declare const getProjectsControllerGetProjectBugDetailQueryOptions: <TData = Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError = unknown>(id: number, bugId: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export type ProjectsControllerGetProjectBugDetailQueryResult = NonNullable<Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>>;
export type ProjectsControllerGetProjectBugDetailQueryError = unknown;
export declare function useProjectsControllerGetProjectBugDetail<TData = Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError = unknown>(id: number, bugId: number, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectBugDetail<TData = Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError = unknown>(id: number, bugId: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError, Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>>, 'initialData'>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
export declare function useProjectsControllerGetProjectBugDetail<TData = Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError = unknown>(id: number, bugId: number, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof projectsControllerGetProjectBugDetail>>, TError, TData>>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
};
/**
 * @summary Update bug status, track dev/qa time, and notify stakeholders
 */
export type projectsControllerUpdateProjectBugStatusResponse200 = {
    data: void;
    status: 200;
};
export type projectsControllerUpdateProjectBugStatusResponseSuccess = (projectsControllerUpdateProjectBugStatusResponse200) & {
    headers: Headers;
};
export type projectsControllerUpdateProjectBugStatusResponse = (projectsControllerUpdateProjectBugStatusResponseSuccess);
export declare const getProjectsControllerUpdateProjectBugStatusUrl: (id: number, bugId: number) => string;
export declare const projectsControllerUpdateProjectBugStatus: (id: number, bugId: number, updateBugStatusDto: UpdateBugStatusDto, options?: RequestInit) => Promise<projectsControllerUpdateProjectBugStatusResponse>;
export declare const getProjectsControllerUpdateProjectBugStatusMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProjectBugStatus>>, TError, {
        id: number;
        bugId: number;
        data: UpdateBugStatusDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProjectBugStatus>>, TError, {
    id: number;
    bugId: number;
    data: UpdateBugStatusDto;
}, TContext>;
export type ProjectsControllerUpdateProjectBugStatusMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerUpdateProjectBugStatus>>>;
export type ProjectsControllerUpdateProjectBugStatusMutationBody = UpdateBugStatusDto;
export type ProjectsControllerUpdateProjectBugStatusMutationError = unknown;
/**
* @summary Update bug status, track dev/qa time, and notify stakeholders
*/
export declare const useProjectsControllerUpdateProjectBugStatus: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerUpdateProjectBugStatus>>, TError, {
        id: number;
        bugId: number;
        data: UpdateBugStatusDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerUpdateProjectBugStatus>>, TError, {
    id: number;
    bugId: number;
    data: UpdateBugStatusDto;
}, TContext>;
/**
 * @summary Add a comment to a project bug
 */
export type projectsControllerAddProjectBugCommentResponse201 = {
    data: void;
    status: 201;
};
export type projectsControllerAddProjectBugCommentResponseSuccess = (projectsControllerAddProjectBugCommentResponse201) & {
    headers: Headers;
};
export type projectsControllerAddProjectBugCommentResponse = (projectsControllerAddProjectBugCommentResponseSuccess);
export declare const getProjectsControllerAddProjectBugCommentUrl: (id: number, bugId: number) => string;
export declare const projectsControllerAddProjectBugComment: (id: number, bugId: number, addBugCommentDto: AddBugCommentDto, options?: RequestInit) => Promise<projectsControllerAddProjectBugCommentResponse>;
export declare const getProjectsControllerAddProjectBugCommentMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerAddProjectBugComment>>, TError, {
        id: number;
        bugId: number;
        data: AddBugCommentDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof projectsControllerAddProjectBugComment>>, TError, {
    id: number;
    bugId: number;
    data: AddBugCommentDto;
}, TContext>;
export type ProjectsControllerAddProjectBugCommentMutationResult = NonNullable<Awaited<ReturnType<typeof projectsControllerAddProjectBugComment>>>;
export type ProjectsControllerAddProjectBugCommentMutationBody = AddBugCommentDto;
export type ProjectsControllerAddProjectBugCommentMutationError = unknown;
/**
* @summary Add a comment to a project bug
*/
export declare const useProjectsControllerAddProjectBugComment: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof projectsControllerAddProjectBugComment>>, TError, {
        id: number;
        bugId: number;
        data: AddBugCommentDto;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof projectsControllerAddProjectBugComment>>, TError, {
    id: number;
    bugId: number;
    data: AddBugCommentDto;
}, TContext>;
export {};
