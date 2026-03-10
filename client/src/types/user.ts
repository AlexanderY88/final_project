import { User } from './auth';

export interface CreateChildBrunchData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mainBrunchId?: string;
}

export interface ChildBranchesResponse {
  message: string;
  count: number;
  childBranches: User[];
}
