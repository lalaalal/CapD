import { Href, router } from 'expo-router';
import { ROUTES } from "@/constants/url";
import { NotificationData } from './types';

const ROUTING_REGISTRY: Record<string, (data: NotificationData) => Href> = {
    CHAT_MESSAGE: (data) => ({
        pathname: ROUTES.CHAT_ROOM,
        params: { roomId: Number(data.room_id) }
    }),
    ITEM_RETURNED: () => ({
        pathname: ROUTES.CHAT,
        params: {}
    }),
    MATCH_FOUND: () => ({
        pathname: ROUTES.MATCHES,
        params: {}
    }),
    THEFT_SUSPECTED: (data) => ({
        pathname: ROUTES.CCTV_RESULT,
        params: { itemId: Number(data.item_id) }
    }),
    LOCKER_READY: () => ({
        pathname: ROUTES.SCAN,
        params: {}
    }),
    CCTV_FOUND: (data) => ({
        pathname: ROUTES.CCTV_RESULT,
        params: { itemId: Number(data.item_id) }
    }),
    QR_SCANNED: (data) => ({
        pathname: ROUTES.CHAT_ROOM,
        params: { roomId: Number(data.room_id) }
    })
}

export const handleNotificationRouting = (data: NotificationData) => {
    const type = data.type;
    if (!type) {
        console.warn("This notification does not have type");
        return;
    }

    const getHref = ROUTING_REGISTRY[type];
    if (!getHref) {
        console.warn(`Unsupported notification type : ${type}`);
        return;
    }

    const href = getHref(data);
    router.navigate(href);
}
