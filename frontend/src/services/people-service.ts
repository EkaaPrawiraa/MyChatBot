import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export type GooglePersonName = {
  displayName?: string;
  givenName?: string;
  familyName?: string;
};

export type GooglePersonPhoneNumber = {
  value?: string;
  canonicalForm?: string;
  type?: string;
  formattedType?: string;
};

export type GooglePerson = {
  resourceName?: string;
  names?: GooglePersonName[];
  phoneNumbers?: GooglePersonPhoneNumber[];
};

export type PeopleSearchResultItem = {
  person?: GooglePerson;
};

export type PeopleSearchResponse = {
  results?: PeopleSearchResultItem[];
  nextPageToken?: string;
};

export const peopleService = {
  async search(params: {
    query: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<PeopleSearchResponse> {
    const qs = new URLSearchParams({
      q: params.query,
      pageSize: String(params.pageSize ?? 50),
    });
    if (params.pageToken) qs.set("pageToken", params.pageToken);

    return apiClient.get<PeopleSearchResponse>(
      `${API_ENDPOINTS.PEOPLE_SEARCH}?${qs.toString()}`,
    );
  },
};
