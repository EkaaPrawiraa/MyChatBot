import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
};

export type DriveSearchResponse = {
  files?: DriveFile[];
  nextPageToken?: string;
};

export type DriveExportResponse = {
  file_id: string;
  mime_type: string;
  text: string;
  truncated: boolean;
  max_bytes: number;
};

export type DriveCreateTextFileResponse = {
  id: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
};

export type DriveCreateGoogleDocResponse = {
  id: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
};

export type DriveCreateGoogleSheetResponse = {
  id: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
};

export const driveService = {
  async search(params: {
    query?: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<DriveSearchResponse> {
    const sp = new URLSearchParams();
    if (params.query?.trim()) sp.set("q", params.query.trim());
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    if (params.pageToken?.trim()) sp.set("pageToken", params.pageToken.trim());
    const endpoint = `${API_ENDPOINTS.DRIVE_SEARCH}?${sp.toString()}`;
    return apiClient.get<DriveSearchResponse>(endpoint);
  },

  async export(params: {
    fileId: string;
    mimeType: string;
    maxBytes?: number;
  }): Promise<DriveExportResponse> {
    const sp = new URLSearchParams();
    sp.set("fileId", params.fileId);
    sp.set("mimeType", params.mimeType);
    if (params.maxBytes) sp.set("maxBytes", String(params.maxBytes));
    const endpoint = `${API_ENDPOINTS.DRIVE_EXPORT}?${sp.toString()}`;
    return apiClient.get<DriveExportResponse>(endpoint);
  },

  async createTextFile(params: {
    name: string;
    content: string;
    mimeType?: string;
    parentId?: string;
  }): Promise<DriveCreateTextFileResponse> {
    return apiClient.post<DriveCreateTextFileResponse>(
      API_ENDPOINTS.DRIVE_CREATE_TEXT,
      {
        name: params.name,
        content: params.content,
        mime_type: params.mimeType || "text/plain",
        parent_id: params.parentId || "",
      },
    );
  },

  async createGoogleDoc(params: {
    name: string;
    content?: string;
    parentId?: string;
  }): Promise<DriveCreateGoogleDocResponse> {
    return apiClient.post<DriveCreateGoogleDocResponse>(
      API_ENDPOINTS.DRIVE_CREATE_DOC,
      {
        name: params.name,
        content: params.content || "",
        parent_id: params.parentId || "",
      },
    );
  },

  async createGoogleSheet(params: {
    name: string;
    csv?: string;
    parentId?: string;
  }): Promise<DriveCreateGoogleSheetResponse> {
    return apiClient.post<DriveCreateGoogleSheetResponse>(
      API_ENDPOINTS.DRIVE_CREATE_SHEET,
      {
        name: params.name,
        csv: params.csv || "",
        parent_id: params.parentId || "",
      },
    );
  },
};
