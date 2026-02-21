import { useMutation } from "@tanstack/react-query";
import { driveService } from "@/src/services/drive-service";

export function useDriveSearch() {
  return useMutation({
    mutationFn: (params: {
      query?: string;
      pageSize?: number;
      pageToken?: string;
    }) => driveService.search(params),
  });
}

export function useDriveExport() {
  return useMutation({
    mutationFn: (params: {
      fileId: string;
      mimeType: string;
      maxBytes?: number;
    }) => driveService.export(params),
  });
}

export function useDriveCreateTextFile() {
  return useMutation({
    mutationFn: (params: {
      name: string;
      content: string;
      mimeType?: string;
      parentId?: string;
    }) => driveService.createTextFile(params),
  });
}

export function useDriveCreateGoogleDoc() {
  return useMutation({
    mutationFn: (params: {
      name: string;
      content?: string;
      parentId?: string;
    }) => driveService.createGoogleDoc(params),
  });
}

export function useDriveCreateGoogleSheet() {
  return useMutation({
    mutationFn: (params: { name: string; csv?: string; parentId?: string }) =>
      driveService.createGoogleSheet(params),
  });
}
