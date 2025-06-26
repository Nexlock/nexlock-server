export interface CreateModuleRequest {
  name: string;
  deviceId: string;
  description?: string;
  location?: string;
  adminId: string;
  secret: string;
  lockerIds?: string[];
}

export interface CreateAdminWithSystemRequest {
  name?: string;
  email?: string;
  modules: {
    name: string;
    deviceId: string;
    description?: string;
    location?: string;
    lockerIds: string[];
  }[];
  secret: string;
}

export interface EditModuleRequest {
  deviceId: string;
  secret: string;
}

export interface UpdateModuleRequest {
  name?: string;
  description?: string;
  location?: string;
}

export interface ModuleResponse {
  id: string;
  name: string;
  deviceId: string;
  description?: string;
  location?: string;
  adminId?: string;
  createdAt: Date;
  updatedAt: Date;
  lockers?: LockerResponse[];
}

export interface LockerResponse {
  id: string;
  lockerId: string;
  createdAt: Date;
  updatedAt: Date;
}
