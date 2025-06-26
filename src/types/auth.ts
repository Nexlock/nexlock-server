export interface AuthUser {
  id: string;
  email: string;
  name: string;
  type: "user" | "admin";
}

export interface RegisterUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface RegisterAdminRequest {
  email: string;
  name: string;
  password: string;
  registrationCode: string;
}

export interface CreateRegistrationCodeRequest {
  adminId: string;
  secret: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<AuthUser, "type">;
}

export interface CreateRegistrationCodeResponse {
  code: string;
  expiresAt: Date;
}
