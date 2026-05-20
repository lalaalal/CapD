import client from "../client";
import {
    ApiResponse,
    ChatRoomRecord,
    CloseChatRoomRequest,
    CreateChatRoomByOwnerRequest,
    CreateChatRoomRequest,
    CreateChatRoomResult,
    FindChatRoomResult,
    ListChatRoomResult,
    ListMessagesResult,
    MessageFilter,
} from "../types";

export const chatService = {
  // 채팅방 목록 조회 (ID 목록)
  getChatRooms: async () => {
    const res =
      await client.get<ApiResponse<ListChatRoomResult>>("/api/chat-rooms/");
    return res.data;
  },

  // 채팅방 상세 조회
  getChatRoom: async (roomId: number) => {
    const res = await client.get<ApiResponse<ChatRoomRecord>>(
      `/api/chat-rooms/${roomId}`,
    );
    return res.data;
  },

  // 게시글 기준 채팅방 조회
  findChatRoom: async (itemId: number) => {
    const res = await client.get<ApiResponse<FindChatRoomResult>>(
      `/api/chat-rooms/find/${itemId}`,
    );
    return res.data;
  },

  // 채팅방 생성
  createChatRoom: async (data: CreateChatRoomRequest) => {
    const res = await client.post<ApiResponse<CreateChatRoomResult>>(
      "/api/chat-rooms/create",
      data,
    );
    return res.data;
  },

  createChatRoomByOwner: async (data: CreateChatRoomByOwnerRequest) => {
    const res = await client.post<ApiResponse<CreateChatRoomResult>>(
      "/api/chat-rooms/by-owner",
      data
    );
    return res.data;
  },

  // 메시지 목록 조회
  getMessages: async (roomId: number, filter?: MessageFilter) => {
    const res = await client.get<ApiResponse<ListMessagesResult>>(
      `/api/chat-rooms/${roomId}/messages`,
      { data: filter },
    );
    return res.data;
  },

  // 채팅방 읽기
  readChatRoom: async (roomId: number) => {
      const res = await client.get<ApiResponse<string>>(
          `/api/chat-rooms/${roomId}/read`,
          {},
      );
      return res.data;
  },

  // 메시지 전송
  sendMessage: async (roomId: number, message: string) => {
    const res = await client.post<ApiResponse<string>>(
      `/api/chat-rooms/${roomId}/messages/send`,
      { message },
    );
    return res.data;
  },

  // 채팅방 종료
  closeChatRoom: async (roomId: number, reason: "RETURNED" | "ABANDONED") => {
    const res = await client.patch<ApiResponse<string>>(
      `/api/chat-rooms/${roomId}/close`,
      { reason } as CloseChatRoomRequest,
    );
    return res.data;
  },

  // 채팅방 재개
  reopenChatRoom: async (roomId: number) => {
    const res = await client.patch<ApiResponse<string>>(
      `/api/chat-rooms/${roomId}/reopen`,
    );
    return res.data;
  },
};
