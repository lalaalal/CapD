import axiosInstance from "../client";
import {UserProfile, UpdateProfileRequest, ScanOwnerResult, ApiResponse} from "../types";
import {PROFILE_ME_URL, USER_ACCOUNT_URL} from "@/constants/url";

export const userService = {
    getProfile: async () => {
        // 백엔드가 ApiResponse 래퍼를 사용하지 않고 ProfileSummaryResponse를 직접 반환함
        const response = await axiosInstance.get<UserProfile>(PROFILE_ME_URL);
        return response.data;
    },

    updateProfile: async (data: UpdateProfileRequest) => {
        // 백엔드가 PutMapping을 사용하며, ApiResponse 래퍼 없음
        const response = await axiosInstance.put<void>(PROFILE_ME_URL, data);
        return response.data;
    },

    deleteAccount: async () => {
        // 필요시 구현 (ready ui에 있길래 넣어보긴함)
        const response = await axiosInstance.delete<void>(USER_ACCOUNT_URL);
        return response.data;
    },

    scanQrCode: async (url: string) => {
      const response = await axiosInstance.get<ApiResponse<ScanOwnerResult>>(url);
      return response.data;
    }
};
