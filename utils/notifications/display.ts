import notifee, { AndroidAction, AndroidImportance, Notification } from '@notifee/react-native';
import { ZoopickRemoteMessage } from './types';

const createNotification = async (message: ZoopickRemoteMessage, actions: AndroidAction[] = []) => {
    const data = message?.data;
    const title = data?.title;
    const body = data?.body;
    const channelId = await notifee.createChannel({
        id: 'zoopick_default',
        name: 'Default Zooipck Channel',
        importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
        title,
        body,
        data: data as Notification['data'],
        android: {
            channelId,
            actions,
            pressAction: {
                id: 'openPage',
                launchActivity: 'default'
            }
        }
    })
}

const createSimpleNotification = async (message: ZoopickRemoteMessage) => {
    createNotification(message);
}

const createChatNotification = async (message: ZoopickRemoteMessage) => {
    createNotification(message, [
        {
            title: '읽음',
            pressAction: { id: 'read' }
        },
        {
            title: '답장',
            pressAction: { id: 'reply' },
            input: true
        }
    ]);
}

const NOTIFICATION_DISPLAY_REGISTRY: Record<string, (message: ZoopickRemoteMessage) => void> = {
    CHAT_MESSAGE: createChatNotification,
}

export const displayNotification = async (message: ZoopickRemoteMessage) => {
    const data = message?.data;
    if (!data) return;
    const type = data?.type;
    if (!type) return;
    const displayer = NOTIFICATION_DISPLAY_REGISTRY[type];
    if (displayer) {
        displayer(message);
    } else {
        createSimpleNotification(message);
    }
}
