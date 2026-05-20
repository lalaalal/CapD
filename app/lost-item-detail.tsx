import { BASE_BUILDINGS } from "@/constants/buildings";
import {
  CATEGORY_ICON_MAP,
  CATEGORY_MAP,
  ITEM_STATUS_LABEL,
  ITEM_STATUS_STYLE,
  ITEM_TYPE_MAP,
} from "@/constants/categories";
import { fonts } from "@/constants/typography";
import { BASE_URL } from "@/constants/url";
import { useChatMutations } from "@/hooks/mutations/useChatMutations";
import { useItemQueries } from "@/hooks/queries/useItemQueries";
import { useMetadataQueries } from "@/hooks/queries/useMetadataQueries";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronLeft,
  MapPin,
  MessageCircle,
  Package,
  Share2,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const KAKAO_API_KEY = "7488059674373cdf0eb9299fef1ec2ec";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const h = d.getHours();
  const ampm = h < 12 ? "오전" : "오후";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${ampm} ${String(hh).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function LostItemDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showImageModal, setShowImageModal] = useState(false);

  const { data: response, isLoading } = useItemQueries.useItemDetail(id!);
  const createChatRoomMutation = useChatMutations.useCreateChatRoom();
  const { data: buildingsRes } = useMetadataQueries.useBuildings();
  const apiBuildings = buildingsRes?.data?.data ?? [];

  const itemPost = response?.success ? response.data : null;

  const imageUrl = itemPost?.image_url
    ? itemPost.image_url.startsWith("http")
      ? itemPost.image_url
      : `${BASE_URL}${itemPost.image_url}`
    : null;

  // 채팅 버튼 클릭 핸들러 (테스트용 ID 하드코딩)
  const handleChatPress = useCallback(() => {
    if (!itemPost) return;

    console.log("reporter_id:", itemPost.reporter_id); // 추가!
    console.log("=== 채팅 생성 테스트 시작 ===");
    console.log("아이템 ID:", itemPost.item_id);

    createChatRoomMutation.mutate(
      {
        item_id: itemPost.item_id,
        // 테스트를 위해 에뮬레이터 계정 ID를 1로 가정하고 하드코딩합니다.
        //counterpart_id: 1,
        // reporter_id 추가되면
        counterpart_id: itemPost.reporter_id ?? 0,
      },
      {
        onSuccess: (res) => {
          console.log("채팅방 생성 성공:", JSON.stringify(res, null, 2)); // 이걸로 교체
          if (res.success && res.data.room_data) {
            console.log("ROOM ID:", res.data.room_data.room_id); // 이것도 추가
            // Expo Router 타입 시스템에 맞춘 안전한 이동 방식
            router.push({
              pathname: "/chat-room",
              params: { roomId: res.data.room_data.room_id },
            });
          }
        },
        onError: (error) => {
          console.error("채팅방 생성 실패:", error);
          Alert.alert(
            "알림",
            "채팅방을 연결할 수 없습니다. 서버 로그를 확인하세요.",
          );
        },
      },
    );
  }, [itemPost, createChatRoomMutation, router]);

  const handleShare = async () => {
    if (!itemPost) return;
    const sharedBuildingName =
      apiBuildings.find((b) => b.id === itemPost.building_id)?.name ?? "";
    const locationText = itemPost.data_address
      ? `${sharedBuildingName} · ${itemPost.data_address}`
      : sharedBuildingName;
    try {
      await Share.share({
        message: `[줍픽] ${itemPost.title ?? "분실물"} - ${locationText}`,
      });
    } catch {
      Alert.alert("공유 실패");
    }
  };

  const handleMatchRequest = () => {
    Alert.alert(
      "매칭 요청",
      "이 물건이 내 물건이 맞나요?\n요청 후 상대방과 채팅으로 확인할 수 있어요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "맞아요!",
          onPress: () => {
            Alert.alert("요청 완료", "매칭 요청을 보냈어요!");
          },
        },
      ],
    );
  };

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

  if (!itemPost) {
    return (
      <View
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={{ color: "#aaa", fontFamily: fonts.regular }}>
          게시글을 찾을 수 없어요
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: "#6366f1", fontFamily: fonts.bold }}>
            돌아가기
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const korCategory = CATEGORY_MAP[itemPost.category] ?? "기타";
  const IconComponent = CATEGORY_ICON_MAP[itemPost.category] ?? Package;
  const isTheftConfirmed = itemPost.status === "THEFT_CONFIRMED";
  const statusStyle = (isTheftConfirmed
    ? ITEM_STATUS_STYLE.THEFT_CONFIRMED
    : ITEM_STATUS_STYLE[itemPost.type]) ?? { bg: "#f3f4f6", text: "#888" };
  const buildingName =
    apiBuildings.find((b) => b.id === itemPost.building_id)?.name ?? "";
  const detailLocation = itemPost.data_address ?? "";
  const coordBuilding = BASE_BUILDINGS.find((b) => b.name === buildingName);
  const lat = coordBuilding?.lat;
  const lng = coordBuilding?.lng;
  const hasLocation = lat != null && lng != null;

  const mapHTML = hasLocation
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"><style>* { margin: 0; padding: 0; box-sizing: border-box; } html, body, #map { width: 100%; height: 100%; }</style></head><body><div id="map"></div><script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&autoload=true"></script><script>var map = new kakao.maps.Map(document.getElementById('map'), { center: new kakao.maps.LatLng(${lat}, ${lng}), level: 3 }); new kakao.maps.Marker({ position: new kakao.maps.LatLng(${lat}, ${lng}), map: map });</script></body></html>`
    : "";

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={imageUrl ? styles.heroArea : styles.heroAreaSmall}>
          {imageUrl ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowImageModal(true)}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.heroNoImage}>
              <View style={styles.heroIconWrap}>
                <IconComponent size={52} color="#6366f1" />
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color={imageUrl ? "#fff" : "#333"} />
          </TouchableOpacity>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{korCategory}</Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
            >
              <Text
                style={[styles.statusBadgeText, { color: statusStyle.text }]}
              >
                {isTheftConfirmed
                  ? ITEM_STATUS_LABEL.THEFT_CONFIRMED
                  : ITEM_TYPE_MAP[itemPost.type]}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{itemPost.title ?? "제목 없음"}</Text>

          <View style={styles.locationCard}>
            <View style={styles.locationIconWrap}>
              <MapPin size={18} color="#6366f1" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationBuilding}>{buildingName}</Text>
              {detailLocation ? (
                <Text style={styles.locationDetail}>{detailLocation}</Text>
              ) : null}
            </View>
            <View style={styles.locationTimeWrap}>
              <Text style={styles.locationTimeLabel}>
                {itemPost.type === "FOUND" ? "습득" : "분실"}
              </Text>
              <Text style={styles.locationTime}>
                {formatDateTime(itemPost.created_at)}
              </Text>
            </View>
          </View>

          {isTheftConfirmed && (
            <View style={styles.theftBanner}>
              <AlertTriangle size={16} color="#dc2626" />
              <Text style={styles.theftBannerText}>
                도난이 확정된 물건입니다. 경찰에 신고되었거나 수사 중일 수 있어요.
              </Text>
            </View>
          )}

          {itemPost.description && (
            <View style={styles.descSection}>
              <Text style={styles.sectionLabel}>상세 설명</Text>
              <Text style={styles.descText}>{itemPost.description}</Text>
            </View>
          )}

          {hasLocation && (
            <>
              <Text style={styles.sectionLabel}>위치</Text>
              <View style={styles.mapWrap}>
                <WebView
                  source={{ html: mapHTML }}
                  style={styles.map}
                  javaScriptEnabled
                  domStorageEnabled
                  scrollEnabled={false}
                />
              </View>
            </>
          )}

          <View style={styles.chatBanner}>
            <View style={styles.chatBannerIcon}>
              <MessageCircle size={18} color="#6366f1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatBannerTitle}>채팅으로 문의하기</Text>
              <Text style={styles.chatBannerDesc}>
                분실물을 발견하셨거나 본인 소유물이라면 채팅으로 연락해 주세요.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        {itemPost.type === "FOUND" && !isTheftConfirmed && (
          <TouchableOpacity
            style={styles.matchBtn}
            onPress={handleMatchRequest}
            activeOpacity={0.85}
          >
            <Text style={styles.matchBtnText}>이 물건 내 거예요</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.chatBtn, isTheftConfirmed && styles.chatBtnDisabled]}
          onPress={isTheftConfirmed ? undefined : handleChatPress}
          activeOpacity={isTheftConfirmed ? 1 : 0.85}
          disabled={createChatRoomMutation.isPending || isTheftConfirmed}
        >
          {createChatRoomMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MessageCircle size={18} color="#fff" />
              <Text style={styles.chatBtnText}>
                {isTheftConfirmed ? "도난 확정 처리됨" : "채팅으로 문의하기"}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Share2 size={18} color="#888" />
        </TouchableOpacity>
      </View>

      <Modal visible={showImageModal} transparent animationType="fade">
        <View style={styles.imageModal}>
          <TouchableOpacity
            style={[styles.imageModalClose, { top: insets.top + 12 }]}
            onPress={() => setShowImageModal(false)}
          >
            <X size={22} color="#fff" />
          </TouchableOpacity>
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.imageModalImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  heroArea: { width: "100%", height: 380, position: "relative" },
  heroAreaSmall: { width: "100%", position: "relative" },
  heroImage: { width: "100%", height: 380 },
  heroNoImage: {
    width: "100%",
    height: 280,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  categoryBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: { fontSize: 11, fontFamily: fonts.bold, color: "#888" },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontFamily: fonts.bold },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#111",
    marginBottom: 16,
    lineHeight: 30,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8fa",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfo: { flex: 1 },
  locationBuilding: { fontSize: 15, fontFamily: fonts.bold, color: "#111" },
  locationDetail: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#aaa",
    marginTop: 2,
  },
  locationTimeWrap: { alignItems: "flex-end" },
  locationTimeLabel: { fontSize: 10, fontFamily: fonts.regular, color: "#aaa" },
  locationTime: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#555",
    marginTop: 2,
  },
  descSection: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#aaa",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#444",
    lineHeight: 22,
  },
  mapWrap: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
  },
  map: { flex: 1 },
  chatBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eef2ff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  chatBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(99,102,241,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatBannerTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#6366f1",
    marginBottom: 2,
  },
  chatBannerDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#6366f1",
    opacity: 0.8,
    lineHeight: 16,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  matchBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#6366f130",
  },
  matchBtnText: { fontSize: 14, fontFamily: fonts.bold, color: "#6366f1" },
  chatBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#6366f1",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatBtnText: { fontSize: 15, fontFamily: fonts.bold, color: "#fff" },
  chatBtnDisabled: { backgroundColor: "#f87171", opacity: 0.6 },
  theftBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  theftBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#dc2626",
    lineHeight: 19,
  },
  shareBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#f5f6f8",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModal: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalClose: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalImg: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
});
