import { ApiResponse, ListMessagesResult, MessageRecord } from "@/api/types";
import { ConnectionStatus } from "@/api/websocket/chatSocket";
import { fonts } from "@/constants/typography";
import { ROUTES } from "@/constants/url";
import { useChatMutations } from "@/hooks/mutations/useChatMutations";
import {
  CHAT_QUERY_KEYS,
  useChatQueries,
} from "@/hooks/queries/useChatQueries";
import { useProfile } from "@/hooks/queries/useUserQueries";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Send,
  User,
  WifiOff,
} from "lucide-react-native";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
    return "오늘";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const GROUP_TIME_THRESHOLD = 60 * 1000;

const isSameGroup = (prev: MessageRecord, curr: MessageRecord): boolean => {
  if (prev.sender_nickname !== curr.sender_nickname) return false;
  if (prev.sender_id === null || curr.sender_id === null) return false;
  const prevTime = new Date(prev.sent_at).getTime();
  const currTime = new Date(curr.sent_at).getTime();
  return Math.abs(currTime - prevTime) <= GROUP_TIME_THRESHOLD;
};

type DateItem = { type: "date"; label: string; key: string };
type ListItem = MessageRecord | DateItem;

const DateLabel = memo(({ label }: { label: string }) => (
  <View style={styles.dateLabelWrap}>
    <Text style={styles.dateLabel}>{label}</Text>
  </View>
));
DateLabel.displayName = "DateLabel";

const SystemMessage = memo(({ message }: { message: string }) => (
  <View style={styles.systemMsgWrap}>
    <Text style={styles.systemMsg}>{message}</Text>
  </View>
));
SystemMessage.displayName = "SystemMessage";

const ChatMessage = memo(
  ({
    msg,
    isMine,
    isFirstInGroup,
    isLastInGroup,
  }: {
    msg: MessageRecord;
    isMine: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
  }) => {
    return (
      <View
        style={[
          styles.msgRow,
          isMine && styles.msgRowMine,
          !isLastInGroup && styles.msgRowGrouped,
        ]}
      >
        {!isMine && (
          <View style={styles.msgAvatarSlot}>
            {isFirstInGroup && (
              <View style={styles.msgAvatar}>
                <User size={16} color="#aaa" />
              </View>
            )}
          </View>
        )}
        <View style={styles.msgCol}>
          {!isMine && isFirstInGroup && (
            <Text style={styles.msgSender}>{msg.sender_nickname}</Text>
          )}
          <View
            style={[
              styles.msgBubble,
              isMine ? styles.msgBubbleMine : styles.msgBubbleOther,
              !isMine && !isFirstInGroup && styles.msgBubbleOtherContinued,
              !isMine && !isLastInGroup && styles.msgBubbleOtherNotLast,
              isMine && !isFirstInGroup && styles.msgBubbleMineContinued,
              isMine && !isLastInGroup && styles.msgBubbleMineNotLast,
            ]}
          >
            <Text style={[styles.msgText, isMine && styles.msgTextMine]}>
              {msg.message}
            </Text>
          </View>
          {isLastInGroup && (
            <View style={styles.msgMeta}>
              {isMine && !msg.read_at && (
                <Text style={styles.unreadMark}>1</Text>
              )}
              <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
                {formatTime(msg.sent_at)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.msg.sent_at === next.msg.sent_at &&
    prev.msg.message === next.msg.message &&
    prev.msg.read_at === next.msg.read_at &&
    prev.isMine === next.isMine &&
    prev.isFirstInGroup === next.isFirstInGroup &&
    prev.isLastInGroup === next.isLastInGroup,
);
ChatMessage.displayName = "ChatMessage";

// 연결 상태 배너 컴포넌트
const ConnectionBanner = memo(
  ({
    status,
    onReconnect,
  }: {
    status: ConnectionStatus;
    onReconnect: () => void;
  }) => {
    if (status === "CONNECTED") return null;

    let bgColor = "#fef3c7";
    let textColor = "#92400e";
    let iconColor = "#f59e0b";
    let message = "";
    let showRetry = false;

    if (status === "CONNECTING") {
      message = "연결 중...";
    } else if (status === "RECONNECTING") {
      message = "재연결 중...";
    } else if (status === "ERROR") {
      bgColor = "#fee2e2";
      textColor = "#991b1b";
      iconColor = "#ef4444";
      message = "연결에 실패했어요";
      showRetry = true;
    } else if (status === "DISCONNECTED") {
      bgColor = "#f3f4f6";
      textColor = "#6b7280";
      iconColor = "#9ca3af";
      message = "연결이 끊어졌어요";
      showRetry = true;
    }

    return (
      <View style={[styles.connectionBanner, { backgroundColor: bgColor }]}>
        {status === "CONNECTING" || status === "RECONNECTING" ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <WifiOff size={14} color={iconColor} />
        )}
        <Text style={[styles.connectionBannerText, { color: textColor }]}>
          {message}
        </Text>
        {showRetry && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onReconnect}
            activeOpacity={0.7}
          >
            <RefreshCw size={12} color={textColor} />
            <Text style={[styles.retryBtnText, { color: textColor }]}>
              재시도
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
);
ConnectionBanner.displayName = "ConnectionBanner";

export default function ChatRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const flatListRef = useRef<FlatList>(null);
  const roomIdNum = Number(roomId);
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);

  const { data: profile } = useProfile();
  const { data: roomData, isLoading: isRoomLoading } =
    useChatQueries.useChatRoom(roomIdNum, true);
  const { data: messagesData, isLoading: isMessagesLoading } =
    useChatQueries.useMessages(roomIdNum, false);

  const {
    sendMessage: wsSendMessage,
    isConnected: wsConnected,
    reconnect,
    status,
  } = useChatSocket(roomIdNum, true);

  const sendMessageMutation = useChatMutations.useSendMessage(
    roomIdNum,
    profile?.nickname,
  );
  const closeChatRoomMutation = useChatMutations.useCloseChatRoom(roomIdNum);
  const reopenChatRoomMutation = useChatMutations.useReopenChatRoom(roomIdNum);

  const chatRoom = roomData?.success ? roomData.data : null;
  const isOwner = profile?.nickname === chatRoom?.owner_nickname;
  const counterpartNickname = isOwner
    ? chatRoom?.finder_nickname
    : chatRoom?.owner_nickname;
  const messages = messagesData?.success ? messagesData.data.messages : [];
  const isClosed = chatRoom?.status !== "OPEN";
  const isLoading = isRoomLoading || isMessagesLoading;

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages.length]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");

    if (wsConnected) {
      wsSendMessage(text);
      queryClient.setQueryData<ApiResponse<ListMessagesResult>>(
        CHAT_QUERY_KEYS.messages(roomIdNum),
        (old) => {
          if (!old?.data) return old;
          const optimistic: MessageRecord = {
            message: text,
            sender_id: -1,
            sender_nickname: profile?.nickname ?? "나",
            sent_at: new Date().toISOString(),
            read_at: null,
          };
          return {
            ...old,
            data: {
              ...old.data,
              messages: [...old.data.messages, optimistic],
            },
          };
        },
      );
      flatListRef.current?.scrollToEnd({ animated: true });
    } else {
      // WebSocket 안 됐을 때 HTTP 폴백 + 사용자에게 알림
      Toast.show({
        type: "info",
        text1: "실시간 연결이 끊겼어요",
        text2: "메시지는 전송되지만 받는 데 시간이 걸릴 수 있어요.",
        position: "bottom",
        visibilityTime: 2500,
      });
      sendMessageMutation.mutate(text, {
        onError: () => {
          Toast.show({
            type: "error",
            text1: "메시지 전송 실패",
            text2: "잠시 후 다시 시도해주세요.",
            position: "bottom",
            visibilityTime: 2500,
          });
          setInputText(text);
        },
        onSuccess: () => {
          flatListRef.current?.scrollToEnd({ animated: true });
        },
      });
    }
  }, [
    inputText,
    wsConnected,
    wsSendMessage,
    queryClient,
    roomIdNum,
    profile,
    sendMessageMutation,
  ]);

  const handleOpenLocker = useCallback(
    () => {
      setShowCloseModal(false);
      const itemId = chatRoom?.item_id;
      if (itemId) {
        router.replace({
          pathname: ROUTES.SCAN,
          params: { itemId: itemId }
        });
      }
    }, []
  );

  const handleClose = useCallback(
    (reason: "RETURNED" | "ABANDONED", navigateToScan = false) => {
      setShowCloseModal(false);
      closeChatRoomMutation.mutate(reason, {
        onSuccess: () => {
          if (reason === "RETURNED" && navigateToScan) {
            Toast.show({
              type: "success",
              text1: "수령 완료! 사물함 QR을 스캔해서 물건을 꺼내주세요.",
              position: "bottom",
              visibilityTime: 3000,
            });
            router.replace("/(tabs)/scan" as any);
          } else {
            Toast.show({
              type: "success",
              text1:
                reason === "RETURNED"
                  ? "거래가 완료되었어요"
                  : "거래가 종료되었어요",
              position: "bottom",
              visibilityTime: 2500,
            });
          }
        },
        onError: () => {
          Toast.show({
            type: "error",
            text1: "거래 종료 실패",
            text2: "다시 시도해주세요.",
            position: "bottom",
            visibilityTime: 2500,
          });
        },
      });
    },
    [closeChatRoomMutation],
  );

  const handleReopen = useCallback(() => {
    reopenChatRoomMutation.mutate(undefined, {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: "채팅방이 재개되었어요",
          position: "bottom",
          visibilityTime: 2500,
        });
      },
      onError: () => {
        Toast.show({
          type: "error",
          text1: "채팅방 재개 실패",
          text2: "다시 시도해주세요.",
          position: "bottom",
          visibilityTime: 2500,
        });
      },
    });
  }, [reopenChatRoomMutation]);

  const messagesWithDates: ListItem[] = [];
  let lastDate = "";
  messages.forEach((msg) => {
    const dateLabel = formatDateLabel(msg.sent_at);
    if (dateLabel !== lastDate) {
      messagesWithDates.push({
        type: "date",
        label: dateLabel,
        key: `date-${msg.sent_at}`,
      });
      lastDate = dateLabel;
    }
    messagesWithDates.push(msg);
  });

  const keyExtractor = useCallback((item: ListItem, i: number) => {
    if ("key" in item) return item.key;
    return `${item.sent_at}-${item.sender_id}-${i}`;
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if ("type" in item && item.type === "date") {
        return <DateLabel label={item.label} />;
      }
      const msg = item as MessageRecord;
      if (msg.sender_id === null) {
        return <SystemMessage message={msg.message} />;
      }
      const isMine = msg.sender_nickname === profile?.nickname;

      const prev = messagesWithDates[index - 1];
      const next = messagesWithDates[index + 1];

      const prevMsg =
        prev && !("type" in prev) ? (prev as MessageRecord) : null;
      const nextMsg =
        next && !("type" in next) ? (next as MessageRecord) : null;

      const isFirstInGroup = !prevMsg || !isSameGroup(prevMsg, msg);
      const isLastInGroup = !nextMsg || !isSameGroup(msg, nextMsg);

      return (
        <ChatMessage
          msg={msg}
          isMine={isMine}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
        />
      );
    },
    [profile?.nickname, messagesWithDates],
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#333" />
        </TouchableOpacity>
        <View style={styles.avatarWrap}>
          <User size={20} color="#aaa" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {counterpartNickname ?? "채팅"}
          </Text>
          {chatRoom?.item_name ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {chatRoom.item_name}
            </Text>
          ) : null}
        </View>
        {!isClosed ? (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => setShowCloseModal(true)}
          >
            <Text style={styles.completeBtnText}>거래 완료</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.reopenBtn} onPress={handleReopen}>
            <Text style={styles.reopenBtnText}>재개</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.moreBtn}>
          <MoreVertical size={20} color="#555" />
        </TouchableOpacity>
      </View>

      {/* 연결 상태 배너 */}
      <ConnectionBanner status={status} onReconnect={reconnect} />

      {/* 분실물 배너 */}
      {chatRoom && (
        <View style={styles.itemBanner}>
          <View style={styles.itemBannerIcon}>
            <Package size={16} color="#6366f1" />
          </View>
          <Text style={styles.itemBannerText} numberOfLines={1}>
            {chatRoom.item_name}
          </Text>
          <ChevronRight size={14} color="#aaa" />
        </View>
      )}

      {isClosed && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>
            {chatRoom?.status === "RESOLVED_RETURNED"
              ? "반환 완료된 거래입니다"
              : "종료된 거래입니다"}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <FlatList
          ref={flatListRef}
          data={messagesWithDates}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          removeClippedSubviews={Platform.OS === "android"}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          initialNumToRender={20}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>첫 메시지를 보내보세요!</Text>
            </View>
          }
        />

        <View style={[styles.inputWrap, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.plusBtn}>
            <Plus size={22} color="#aaa" />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, isClosed && styles.inputDisabled]}
            placeholder={
              isClosed ? "종료된 거래입니다" : "메시지를 입력하세요..."
            }
            placeholderTextColor="#bbb"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isClosed}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isClosed) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isClosed}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showCloseModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCloseModal(false)}
        />
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>거래 종료</Text>
            <Text style={styles.modalDesc}>거래를 어떻게 종료할까요?</Text>
            {isOwner ? (
              <>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => handleClose("RETURNED", true)}
                >
                  <Text style={styles.modalBtnText}>📦 사물함에서 물건을 꺼낼게요</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => handleClose("RETURNED", false)}
                >
                  <Text style={styles.modalBtnText}>🤝 직접 물건을 받았어요</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => handleOpenLocker()}
                >
                  <Text style={styles.modalBtnText}>📦 사물함에서 물건을 넣을게요</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => handleClose("RETURNED")}
                >
                  <Text style={styles.modalBtnText}>✅ 물건을 찾아줬어요</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnGray]}
              onPress={() => handleClose("ABANDONED")}
            >
              <Text style={[styles.modalBtnText, styles.modalBtnTextGray]}>
                거래를 포기할게요
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowCloseModal(false)}
            >
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
    borderWidth: 1.5,
    borderColor: "#6366f130",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111" },
  headerSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#aaa",
    marginTop: 1,
  },
  completeBtn: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completeBtnText: { fontSize: 13, fontFamily: fonts.bold, color: "#6366f1" },
  reopenBtn: {
    backgroundColor: "#f5f6f8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reopenBtnText: { fontSize: 13, fontFamily: fonts.bold, color: "#888" },
  moreBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  // 연결 상태 배너
  connectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  connectionBannerText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginLeft: 4,
  },
  retryBtnText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  closedBanner: {
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#f5f6f8",
  },
  closedText: { fontSize: 13, fontFamily: fonts.bold, color: "#aaa" },
  messageList: { paddingHorizontal: 16, paddingVertical: 16 },
  dateLabelWrap: { alignItems: "center", paddingVertical: 12 },
  dateLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#aaa",
    backgroundColor: "#f5f6f8",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  msgRowMine: { flexDirection: "row-reverse" },
  msgRowGrouped: { marginBottom: 2 },
  msgAvatarSlot: { width: 32 },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
    borderWidth: 1.5,
    borderColor: "#6366f130",
    alignItems: "center",
    justifyContent: "center",
  },
  msgCol: { maxWidth: "70%", gap: 3 },
  msgSender: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#888",
    marginBottom: 4,
    marginLeft: 4,
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgBubbleOther: {
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
  },
  msgBubbleMine: {
    backgroundColor: "#6366f1",
    borderRadius: 18,
  },
  msgBubbleOtherContinued: { borderTopLeftRadius: 4 },
  msgBubbleOtherNotLast: { borderBottomLeftRadius: 4 },
  msgBubbleMineContinued: { borderTopRightRadius: 4 },
  msgBubbleMineNotLast: { borderBottomRightRadius: 4 },
  msgText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111",
    lineHeight: 20,
  },
  msgTextMine: { color: "#fff" },
  msgMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
  },
  unreadMark: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#6366f1",
  },
  msgTime: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: "#bbb",
  },
  msgTimeMine: { textAlign: "right" },
  systemMsgWrap: { alignItems: "center", paddingVertical: 4 },
  systemMsg: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#aaa",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  plusBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#f5f6f8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111",
  },
  inputDisabled: { backgroundColor: "#f0f0f0", color: "#bbb" },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: "#d1d5db", shadowOpacity: 0 },
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: "#aaa", fontFamily: fonts.regular },
  itemBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fafbff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  itemBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  itemBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#555",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontFamily: fonts.bold, color: "#111" },
  modalDesc: { fontSize: 14, fontFamily: fonts.regular, color: "#666" },
  modalBtn: {
    backgroundColor: "#eef2ff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnGray: { backgroundColor: "#f5f6f8" },
  modalBtnText: { fontSize: 14, fontFamily: fonts.bold, color: "#6366f1" },
  modalBtnTextGray: { color: "#888" },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontFamily: fonts.regular, color: "#aaa" },
});
