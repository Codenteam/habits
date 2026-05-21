import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, ServerFlags } from '../../lib/api';

interface ServerFlagsState {
  flags: ServerFlags;
  loaded: boolean;
}

const allEnabled: ServerFlags = {
  allowExecute: true,
  allowModulesInstall: true,
  allowFormsAuth: true,
  allowSecurityApi: true,
  allowExport: true,
  allowServe: true,
  allowAIGen: true,
};

const initialState: ServerFlagsState = {
  flags: allEnabled,
  loaded: false,
};

export const fetchServerFlags = createAsyncThunk('serverFlags/fetch', async () => {
  return await api.getServerFlags();
});

export const serverFlagsSlice = createSlice({
  name: 'serverFlags',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchServerFlags.fulfilled, (state, action) => {
      state.flags = action.payload;
      state.loaded = true;
    });
  },
});

export const selectServerFlags = (state: { serverFlags: ServerFlagsState }) => state.serverFlags.flags;
