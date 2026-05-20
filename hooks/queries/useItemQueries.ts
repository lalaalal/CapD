import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {itemService} from "@/api/services/item";
import {ItemFilter} from "@/api/types";

export const useItemQueries = {
    useItems: (page = 0, size = 20, filter: ItemFilter = {}) => {
        return useQuery({
            queryKey: ["items", page, size, filter],
            queryFn: () => itemService.getItems(page, size, filter),
        });
    },

    useInfiniteItems: (size = 20, filter: ItemFilter = {}) => {
        return useInfiniteQuery({
            queryKey: ["items", "infinite", size, filter],
            queryFn: ({pageParam = 0}) =>
                itemService.getItems(pageParam as number, size, filter),
            getNextPageParam: (lastPage, allPages) => {
                if (lastPage.success && lastPage.data.item_posts.length === size) {
                    return allPages.length; // 다음 페이지 번호
                }
                return undefined;
            },
            initialPageParam: 0,
        });
    },

    useItemDetail: (id: number | string) => {
        return useQuery({
            queryKey: ["itemDetail", id],
            queryFn: () => itemService.getItemPost(id),
            enabled: !!id,
        });
    },
};
