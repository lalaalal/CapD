import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatService } from "../../api/services/chat";
import {
  ApiResponse,
  CreateChatRoomByOwnerRequest,
  CreateChatRoomRequest,
  ListMessagesResult,
  MessageRecord,
} from "../../api/types";
import { CHAT_QUERY_KEYS } from "../queries/useChatQueries";

export const useChatMutations = {
  // 채팅방 생성
  useCreateChatRoom: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (data: CreateChatRoomRequest) =>
        chatService.createChatRoom(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.rooms });
      },
    });
  },

  useCreateChatRoomByOwner: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (data: CreateChatRoomByOwnerRequest) => 
        chatService.createChatRoomByOwner(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.rooms });
      }
    });
  },

  // 메시지 전송 (Optimistic Update)
  useSendMessage: (roomId: number, myNickname?: string, myUserId?: number) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (message: string) => chatService.sendMessage(roomId, message),

      // 1. 서버 응답 전에 UI에 먼저 반영
      onMutate: async (message: string) => {
        await queryClient.cancelQueries({
          queryKey: CHAT_QUERY_KEYS.messages(roomId),
        });

        const previousData = queryClient.getQueryData<
          ApiResponse<ListMessagesResult>
        >(CHAT_QUERY_KEYS.messages(roomId));

        const optimisticMessage: MessageRecord = {
          message,
          sender_id: myUserId ?? -1,
          sender_nickname: myNickname ?? "나",
          sent_at: new Date().toISOString(),
          read_at: null,
        };

        queryClient.setQueryData<ApiResponse<ListMessagesResult>>(
          CHAT_QUERY_KEYS.messages(roomId),
          (old) => {
            if (!old?.data) return old;
            return {
              ...old,
              data: {
                ...old.data,
                messages: [...old.data.messages, optimisticMessage],
              },
            };
          },
        );

        return { previousData };
      },

      // 2. 실패 시 롤백
      onError: (_err, _msg, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            CHAT_QUERY_KEYS.messages(roomId),
            context.previousData,
          );
        }
      },

      // 3. 성공/실패 모두 다시 동기화
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: CHAT_QUERY_KEYS.messages(roomId),
        });
      },
    });
  },

  // 채팅방 종료
  useCloseChatRoom: (roomId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (reason: "RETURNED" | "ABANDONED") =>
        chatService.closeChatRoom(roomId, reason),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: CHAT_QUERY_KEYS.room(roomId),
        });
        queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.rooms });
      },
    });
  },

  // 채팅방 재개
  useReopenChatRoom: (roomId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: () => chatService.reopenChatRoom(roomId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: CHAT_QUERY_KEYS.room(roomId),
        });
      },
    });
  },
};
