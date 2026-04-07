import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as userService from '../../services/users';
import { User } from '../../types/auth';
import { extractApiErrorMessage } from '../../utils/error';

interface UsersState {
  users: User[];
  childBranches: User[];
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  childBranches: [],
  selectedUser: null,
  isLoading: false,
  error: null,
};

// Admin only: Fetch all users
export const fetchAllUsers = createAsyncThunk(
  'users/fetchAll',
  async (query: userService.GetAllUsersQuery | undefined, { rejectWithValue }) => {
    try {
      return await userService.getAllUsers(query);
    } catch (error: unknown) {
      return rejectWithValue(extractApiErrorMessage(error, 'Failed to fetch users'));
    }
  }
);

// Main Branch: Fetch its child branches
export const fetchChildBranches = createAsyncThunk(
  'users/fetchChildBranches',
  async (mainBrunchId: string | undefined, { rejectWithValue }) => {
    try {
      return await userService.getChildBranches(mainBrunchId);
    } catch (error: unknown) {
      return rejectWithValue(extractApiErrorMessage(error, 'Failed to fetch child branches'));
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await userService.deleteUser(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(extractApiErrorMessage(error, 'Failed to delete user'));
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Users
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Child Branches
      .addCase(fetchChildBranches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChildBranches.fulfilled, (state, action) => {
        state.isLoading = false;
        // Backend returns { count, childBranches }, extract the array
        state.childBranches = action.payload?.childBranches || [];
      })
      .addCase(fetchChildBranches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete User
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(u => u._id !== action.payload);
        state.childBranches = state.childBranches.filter(u => u._id !== action.payload);
      });
  },
});

export const { clearUserError, setSelectedUser } = usersSlice.actions;
export default usersSlice.reducer;
