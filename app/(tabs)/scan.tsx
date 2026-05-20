import { lockerService } from "@/api/services/locker";
import { userService } from "@/api/services/user";
import { ApiResponse, CreateChatRoomResult, ScanOwnerResult } from "@/api/types";
import { fonts } from "@/constants/typography";
import { ROUTES } from "@/constants/url";
import { useChatMutations } from "@/hooks/mutations/useChatMutations";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Archive,
  Bell,
  Image as ImageIcon,
  MessageCircle,
  QrCode,
  ScanLine,
  User,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ModalType = "owner" | "locker_success" | "locker_fail" | null;

type OwnerInfo = {
  nickname: string;
  ownerId: number;
};

export default function QRScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { itemId: itemIdParam } = useLocalSearchParams<{ itemId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);
  const [lockerId, setLockerId] = useState<number | null>(null);
  const [lockerErrorMsg, setLockerErrorMsg] = useState<string>("");
  const [lockerReady, setLockerReady] = useState(false);
  const isProcessing = useRef(false);

  const createChatRoomByOwnerMutation = useChatMutations.useCreateChatRoomByOwner();

  useEffect(() => {
    if (modalType !== "locker_success") return;
    setLockerReady(false);
    const t = setTimeout(() => setLockerReady(true), 3000);
    return () => clearTimeout(t);
  }, [modalType]);

  const handleScanStart = async () => {
    if (!permission?.granted) {
      const { granted, canAskAgain } = await requestPermission();
      if (!granted) {
        if (!canAskAgain) {
          Alert.alert(
            "카메라 권한 필요",
            "설정에서 카메라 권한을 허용해주세요.",
            [
              { text: "취소", style: "cancel" },
              { text: "설정으로 이동", onPress: () => Linking.openSettings() },
            ],
          );
        }
        return;
      }
    }
    setIsScanning(true);
  };

  const handleQRScanned = async ({ data }: { data: string }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setIsScanning(false);

    try {
      // 사물함 QR: {baseUrl}/scan/lockers/{id}/unlock
      const lockerMatch = data.match(/\/lockers\/(\d+)\/unlock/);
      if (lockerMatch) {
        const id = Number(lockerMatch[1]);
        setLockerId(id);

        try {
          await lockerService.unlock(id, itemIdParam ? Number(itemIdParam) : undefined);
          setModalType("locker_success");
        } catch (e: any) {
          if (e.response?.status === 403) {
            setLockerErrorMsg(e.response?.data?.error ?? "권한이 없습니다.");
            setModalType("locker_fail");
          } else {
            const serverMsg: string | undefined = e.response?.data?.error;
            Alert.alert("오류", serverMsg ?? "사물함 열기에 실패했어요.");
          }
        }
        return;
      }
      const userMatch = data.match(/\/scan\/owner\/(\d+)/)
      if (userMatch) {
        const response: ApiResponse<ScanOwnerResult> = await userService.scanQrCode(data);
        setOwnerInfo({
          ownerId: response.data.owner_id,
          nickname: response.data.nickname,
        });
        setModalType('owner');
        return;
      }

      const parsed = JSON.parse(data);

      // 사물함 QR
      // TODO: 백엔드 QR 데이터 형태 확인 후 조건 수정
      if (parsed.type === "locker" && parsed.lockerId) {
        setLockerId(parsed.lockerId);
        try {
          await lockerService.unlock(parsed.lockerId, parsed.itemId ?? undefined);
          setModalType("locker_success");
        } catch (e: any) {
          if (e.response?.status === 403) {
            setLockerErrorMsg(e.response?.data?.error ?? "권한이 없습니다.");
            setModalType("locker_fail");
          } else {
            const serverMsg: string | undefined = e.response?.data?.error;
            Alert.alert("오류", serverMsg ?? "사물함 열기에 실패했어요.");
          }
        }
      }
      // 물건 QR (ownerQR)
      // TODO: 백엔드 QR 데이터 형태 확인 후 조건 수정
      else {
        Alert.alert("알 수 없는 QR", "인식할 수 없는 QR 코드예요.");
      }
    } catch {
      Alert.alert("인식 실패", "QR 코드를 읽을 수 없어요.");
    } finally {
      isProcessing.current = false;
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("갤러리 권한 필요", "설정에서 갤러리 권한을 허용해주세요.");
      return;
    }
    Alert.alert("준비중", "갤러리 QR 인식은 준비중이에요.");
  };

  const handleTestModal = () => {
    Alert.alert("테스트", "어떤 모달 볼까요?", [
      {
        text: "ownerQR",
        onPress: () => {
          setOwnerInfo({
            nickname: "김민준",
            ownerId: 1
          });
          setModalType("owner");
        },
      },
      {
        text: "보관완료",
        onPress: () => {
          setLockerId(1);
          setModalType("locker_success");
        },
      },
      { text: "권한없음", onPress: () => setModalType("locker_fail") },
      { text: "취소", style: "cancel" },
    ]);
  };

  const handleChat = async () => {
    setModalType(null);
    if (ownerInfo) {
      createChatRoomByOwnerMutation.mutate({
        owner_id: ownerInfo.ownerId
      }, {
        onSuccess: (response: ApiResponse<CreateChatRoomResult>) => {
          const roomId: number = response.data.room_data.room_id;
          router.push({
            pathname: ROUTES.CHAT_ROOM,
            params: { roomId }
          });
        }
      });
    }
  };

  const handleLockerClose = async () => {
    if (lockerId) {
      try {
        await lockerService.lock(lockerId);
      } catch (e) {
        console.error("사물함 닫기 실패", e);
      }
    }
    setModalType(null);
    setLockerId(null);
    if (itemIdParam) {
      router.replace(`${ROUTES.LOST_ITEM_DETAIL}?id=${itemIdParam}` as any);
    }
  };

  // 카메라 스캔 화면
  if (isScanning) {
    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleQRScanned}
        />
        {/* 스캔 오버레이 */}
        <View style={[styles.scanOverlay, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setIsScanning(false)}
          >
            <X size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.scanGuideText}>
            QR 코드를 프레임 안에 맞춰주세요
          </Text>
        </View>
        {/* 스캔 프레임 */}
        <View style={styles.scanFrameWrap}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>QR 스캔</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push(ROUTES.NOTIFICATION)}
          >
            <Bell size={20} color="#444" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(tabs)/mypage" as any)}
          >
            <User size={20} color="#444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 바디 */}
      <View style={styles.body}>
        <Text style={styles.guideText}>
          사물함 QR을 스캔하여 물건을 회수하세요
        </Text>
        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={styles.qrIconWrap}>
              <QrCode size={64} color="#d1d5db" />
            </View>
          </View>
        </View>
        <Text style={styles.frameGuide}>QR 코드를 프레임 안에 맞춰주세요</Text>
      </View>

      {/* 하단 버튼 */}
      <View style={[styles.btnArea, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={handleScanStart}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#6366f1", "#818cf8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scanBtnGradient}
          >
            <ScanLine size={20} color="#fff" />
            <Text style={styles.scanBtnText}>QR 스캔 시작</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.galleryBtn}
          onPress={handleGallery}
          activeOpacity={0.85}
        >
          <ImageIcon size={18} color="#555" />
          <Text style={styles.galleryBtnText}>갤러리에서 QR 불러오기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestModal}
          activeOpacity={0.85}
        >
          <Text style={styles.testBtnText}>🧪 모달 테스트</Text>
        </TouchableOpacity>
      </View>

      {/* ownerQR 모달 */}
      <Modal visible={modalType === "owner"} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalType(null)}
        />
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.ownerAvatar}>
              <User size={32} color="#aaa" />
            </View>
            <Text style={styles.ownerName}>{ownerInfo?.nickname}</Text>
            <Text style={styles.ownerDesc}>
              {ownerInfo?.nickname}님의 잃어버린 물건을 찾으셨나요?
            </Text>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={handleChat}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#6366f1", "#818cf8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chatBtnGradient}
              >
                <MessageCircle size={18} color="#fff" />
                <Text style={styles.chatBtnText}>채팅하기</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeTextBtn}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.closeTextBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 사물함 열림 모달 — 물건 넣은 후 닫기 */}
      <Modal
        visible={modalType === "locker_success"}
        transparent
        animationType="fade"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {}}
        />
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.successIconWrap}>
              <Archive size={32} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>사물함이 열렸어요!</Text>
            <Text style={styles.modalDesc}>
              {itemIdParam
                ? `물건을 사물함에 넣은 후\n아래 버튼을 눌러 닫아주세요.`
                : `물건을 꺼낸 후\n아래 버튼을 눌러 닫아주세요.`}
            </Text>
            <TouchableOpacity
              style={[styles.lockerCloseBtn, !lockerReady && { opacity: 0.45 }]}
              onPress={handleLockerClose}
              disabled={!lockerReady}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#6366f1", "#818cf8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.lockerCloseBtnGradient}
              >
                <Text style={styles.lockerCloseBtnText}>
                  {lockerReady
                    ? (itemIdParam ? "넣었어요, 닫기" : "꺼냈어요, 닫기")
                    : "사물함 열리는 중..."}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 권한없음 모달 */}
      <Modal
        visible={modalType === "locker_fail"}
        transparent
        animationType="fade"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalType(null)}
        />
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.failIconWrap}>
              <X size={32} color="#f87171" />
            </View>
            <Text style={styles.modalTitle}>권한이 없습니다</Text>
            <Text style={styles.modalDesc}>{lockerErrorMsg}</Text>
            <TouchableOpacity
              style={styles.closeTextBtn}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.closeTextBtnText}>닫기</Text>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, color: "#111" },
  headerIcons: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  guideText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#555",
    marginBottom: 40,
    textAlign: "center",
  },
  frameWrap: { marginBottom: 20 },
  frame: {
    width: 240,
    height: 240,
    backgroundColor: "#f5f6f8",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#6366f1",
    borderWidth: 3,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  qrIconWrap: { opacity: 0.5 },
  frameGuide: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#aaa",
    marginTop: 16,
  },
  btnArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  scanBtn: { borderRadius: 14, overflow: "hidden" },
  scanBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    gap: 8,
  },
  scanBtnText: { fontSize: 16, fontFamily: fonts.bold, color: "#fff" },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    gap: 8,
  },
  galleryBtnText: { fontSize: 15, fontFamily: fonts.regular, color: "#555" },
  // 카메라 스캔 오버레이
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scanGuideText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanFrameWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: "relative",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  ownerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  ownerName: { fontSize: 18, fontFamily: fonts.bold, color: "#111" },
  ownerDept: { fontSize: 13, fontFamily: fonts.regular, color: "#6366f1" },
  ownerDesc: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
  },
  ownerItem: { fontFamily: fonts.bold, color: "#111" },
  chatBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
  },
  chatBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    gap: 8,
  },
  chatBtnText: { fontSize: 15, fontFamily: fonts.bold, color: "#fff" },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontFamily: fonts.bold, color: "#111" },
  modalDesc: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#777",
    textAlign: "center",
    lineHeight: 22,
  },
  lockerCloseBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
  },
  lockerCloseBtnGradient: {
    alignItems: "center",
    justifyContent: "center",
    height: 50,
  },
  lockerCloseBtnText: { fontSize: 15, fontFamily: fonts.bold, color: "#fff" },
  failIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  closeTextBtn: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#f5f6f8",
  },
  closeTextBtnText: { fontSize: 15, fontFamily: fonts.regular, color: "#555" },
  testBtn: {
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
  },
  testBtnText: { fontSize: 13, fontFamily: fonts.regular, color: "#aaa" },
});
