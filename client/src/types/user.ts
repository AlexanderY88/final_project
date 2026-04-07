import { User } from './auth';

export interface CreateChildBrunchData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  houseNumber: number;
  zip: number;
  mainBrunchId?: string;
}

export interface ChildBranchesResponse {
  message: string;
  count: number;
  childBranches: User[];
}
