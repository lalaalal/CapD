import axiosInstance from "../client";
import {
    ApiResponse,
    CreateItemRequest,
    CreateItemResponse,
    ItemFilter,
    ItemListResponse,
    ItemPost,
} from "../types";
import {
    ITEMS_CREATE_URL,
    ITEMS_DETAIL_URL,
    ITEMS_LIST_URL,
} from "@/constants/url";

export const itemService = {

    getItems: async (page = 0, size = 20, filter: ItemFilter = {}) => {
        const response = await axiosInstance.post<ApiResponse<ItemListResponse>>(
            `${ITEMS_LIST_URL}?page=${page}&size=${size}`,
            filter,
        );
        return response.data;
    },

    getItemPost: async (id: number | string) => {
        const response = await axiosInstance.get<ApiResponse<ItemPost>>(
            `${ITEMS_LIST_URL}/${id}`, // Swagger docs: /api/items/post/list/{id}
        );
        return response.data;
    },

    createItem: async (data: CreateItemRequest) => {
        const response = await axiosInstance.post<ApiResponse<CreateItemResponse>>(
            ITEMS_CREATE_URL,
            data,
        );
        console.log(response.data);
        return response.data;
    },
};
