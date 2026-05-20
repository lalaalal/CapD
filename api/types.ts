// Generic API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

// Auth Types
export interface LoginRequest {
  schoolEmail: string;
  password?: string;
}

export interface LoginResponse {
  accessToken: string;
  nickname: string;
  department: string;
  grade: string;
  message?: string;
}

export interface SignupRequest {
  schoolEmail: string;
  password?: string;
  nickname?: string;
  department?: string;
  grade?: string;
}

export interface SignupResponse {
  message: string;
  user_id: number;
  access_token: string;
}

export interface CertificationRequest {
  email: string;
}

export interface VerifyRequest {
  email: string;
  certificationNumber: string;
}

export interface CheckNicknameResponse {
  message: string;
  available: boolean;
}

export interface DeviceTokenRequest {
  token: string;
}

// User Profile Types
export interface UserProfile {
  nickname: string;
  department: string;
  postCount: number;
  chatRoomCount: number;
  unreadCount: number;
}

export interface ScanOwnerResult {
  owner_id: number;
  nickname: string;
}

export interface UpdateProfileRequest {
  nickname: string;
  department: string;
}

// --- Pagination ---
export interface Pageable {
  page: number;
  size: number;
  sort?: string[];
}

export interface PageResponse<T> {
  totalElements: number;
  totalPages: number;
  size: number;
  content: T[];
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// --- Timetable & Course ---
export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface CourseSchedule {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface Course {
  courseId: number;
  courseName: string;
  roomName: string;
  buildingId: number;
  buildingName: string;
  buildingCode: string;
  color?: string;
  schedules: CourseSchedule[];
}

export interface BuildingRecord {
  id: number;
  name: string;
}

export interface RoomRecord {
  id: number;
  name: string;
}

export interface TimetableSummary {
  timetableId: number;
  name: string;
  isPrimary: boolean;
  year: number;
  semester: number;
}

export interface SyncCourseRequest {
  courseId: number;
  color: string;
}

export interface SyncTimetableRequest {
  courses: SyncCourseRequest[];
}

export interface CreateTimetableRequest {
  name: string;
  year: number;
  semester: number;
}

// Image Types
export type ImagePurpose = "ITEM";

export interface ImageUploadResponse {
  image_url: string;
  original_filename: string;
}

// Lost Item Types
export type ItemType = "LOST" | "FOUND";
export type ItemStatus =
  | "REPORTED"
  | "MATCHED"
  | "IN_LOCKER"
  | "IN_TRANSIT"
  | "RETRIEVING"
  | "RETURNED"
  | "THEFT_CONFIRMED";

export interface ItemPost {
  id: number;
  title: string;
  description: string;
  item_id: number;
  type: ItemType;
  status: string;
  category: string;
  image_url: string;
  building_id: number;
  data_address: string;
  created_at: string;
  reporter_id?: number;
}

export interface ItemListResponse {
  total: number;
  page: number;
  item_posts: ItemPost[];
}

export interface ItemFilter {
  status?: string;
  category?: string;
  color?: string;
}

export interface CreateItemRequest {
  type: ItemType;
  title: string;
  description: string;
  image_url: string;
  building_id: number;
  detail_address: string;
  reported_at: string;
  category: string;
  color: string;
}

export interface CreateItemResponse {
  item_post_id: number;
  message: string;
  item_status: string;
}

// QR 스캔 시 물품 소유자 정보
export interface ItemOwnerInfoResult {
  nickname: string;
  department: string;
}

// Chat Types
export type ChatRoomStatus =
  | "OPEN"
  | "RESOLVED_RETURNED"
  | "RESOLVED_ABANDONED";

export interface ChatRoomRecord {
  status: ChatRoomStatus;
  room_id: number;
  owner_nickname: string;
  finder_nickname: string;
  item_name: string;
  item_id: number;
}

export interface MessageRecord {
  message: string;
  sender_id: number;
  sender_nickname: string;
  sent_at: string;
  read_at: string | null;
}

export interface ListMessagesResult {
  messages: MessageRecord[];
  chat_room: ChatRoomRecord;
}

export interface CreateChatRoomRequest {
  item_id: number | null;
  counterpart_id: number;
}

export interface CreateChatRoomByOwnerRequest {
  owner_id: number;
}

export interface CreateChatRoomResult {
  created: boolean;
  room_data: ChatRoomRecord;
}

export interface ListChatRoomResult {
  chatRoomIds: number[];
}

export interface FindChatRoomResult {
  exists: boolean;
  room_id: number;
}

export interface CloseChatRoomRequest {
  reason: "RETURNED" | "ABANDONED";
}

export interface MessageFilter {
  start_time?: string;
  end_time?: string;
}

// Matching Types
export type MatchStatus = "CANDIDATE" | "NOTIFIED" | "CONFIRMED" | "REJECTED";
export type MatchType = "LOCKER" | "CHAT";

export interface ItemMatchResultResponse {
  score: number;
  status: MatchStatus;
  match_id: number; // string → number 변경
  found_item_id: number;
  found_post_id: number;
  found_post_title: string;
  found_image_url: string;
  location_name: string; // locationName → location_name 변경
  found_nickname: string;
  found_department: string;
  counterpart_id: number;
  finder_id?: number;
}

// 매칭 확정 응답 (MatchConfirmResponse 로 명세와 맞춤)
export interface MatchConfirmResponse {
  match_id: number;
  match_type: MatchType;
  locker_id: number | null;
  found_item_id: number;
  counterpart_id: number;
}

export interface MatchManualRequest {
  lost_item_id: number;
  found_item_id: number;
}

export type MatchManualType = "LOCKER" | "CHAT";

export interface MatchManualResponse {
  match_id: number;
  match_manual_type: MatchManualType;
  locker_id: number;
}

// CCTV Types
export type CctvReviewStatus = "CONFIRMED_SELF" | "REJECTED_SELF";

export interface CctvMatchedLostItem {
  lost_item_id: number;
  title: string;
  category: string;
  match_count: number;
  reported_at: string;
  image_url: string | null;
}

export interface CctvMyItemsResponse {
  matched_lost_items: CctvMatchedLostItem[];
}

export interface CctvDetection {
  match_id: number;
  score: number;
  detected_at: string;
  building_name: string;
  room_name: string;
  item_snapshot_url: string | null;
  moment_snapshot_url: string | null;
}

export interface CctvItemDetectionsResponse {
  detections: CctvDetection[];
}

export interface CctvReviewRequest {
  review_status: CctvReviewStatus;
}
