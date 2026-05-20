export const BASE_URL =
    process.env.EXPO_PUBLIC_BASE_URL ?? "https://lalaalal.com";

// Auth
export const REGISTER_URL = BASE_URL + "/api/auth/device-token";
export const LOGIN_URL = BASE_URL + "/api/auth/login";
export const LOGOUT_URL = BASE_URL + "/api/auth/logout";
export const SIGNUP_URL = BASE_URL + "/api/auth/signup";
export const CERTIFICATION_URL = BASE_URL + "/api/auth/certification";
export const VERIFY_URL = BASE_URL + "/api/auth/verify";
export const VALIDATION_URL = BASE_URL + "/api/auth/validate";
export const CHECK_NICKNAME_URL = BASE_URL + "/api/auth/check-nickname";

// Items
export const ITEMS_LIST_URL = BASE_URL + "/api/items/post/list";
export const ITEMS_CREATE_URL = BASE_URL + "/api/items/post/create";
export const ITEMS_DETAIL_URL = BASE_URL + "/api/items/post/list";

// User / Profiles
export const PROFILE_ME_URL = BASE_URL + "/api/profiles/me";
export const USER_ACCOUNT_URL = BASE_URL + "/api/user/account";

// Scan
export const SCAN_OWNER = BASE_URL +  "/scan/owner";

// Timetable
export const TIMETABLES_URL = BASE_URL + "/api/timetables";
export const COURSES_URL = BASE_URL + "/api/courses";

// Chat
export const CHAT_ROOM_URL = BASE_URL + "/api/chat-rooms";

// Matching
export const MATCHES_URL = BASE_URL + "/api/matches";

// Metadata
export const BUILDINGS_URL = BASE_URL + "/api/metadata/buildings";
export const ITEM_CATEGORIES_URL = BASE_URL + "/api/metadata/item-categories";

// Images
export const IMAGE_UPLOAD_URL = BASE_URL + "/api/images/upload";

export const CCTV_DETECTIONS_URL = BASE_URL + "/api/cctv/detections/me";
export const CCTV_REVIEW_URL = (matchId: number): string =>
    BASE_URL + `/api/cctv/detections/${matchId}/review`;

// App Routes (Navigation)
export const ROUTES = {
    HOME: "/",
    LOGIN: "/(auth)/login",
    SIGNUP: "/(auth)/signup/email",
    SIGNUP_VERIFY: "/(auth)/signup/verify",
    SIGNUP_PASSWORD: "/(auth)/signup/password",
    SIGNUP_PROFILE: "/(auth)/signup/profile",
    LOST_ITEM_BOARD: "/(tabs)/lost-item",
    LOST_ITEM_REGISTER: "/lost-item-register",
    LOST_ITEM_DETAIL: "/lost-item-detail",
    CHAT: "/(tabs)/chat",
    CHAT_ROOM: "/chat-room",
    MAP: "/(tabs)/map",
    MYPAGE: "/(tabs)/mypage",
    SCAN: "/(tabs)/scan",
    LOADING: "/loading",
    NOTIFICATION: "/notifications",
    MATCHES: "/matches",
    MY_QR: "/my-qr",
    CCTV_RESULT: "/cctv-result",
    CCTV_ITEMS: "/cctv-items",
} as const;
