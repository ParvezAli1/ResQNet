import { db } from './firebase';
import { ref, push, onChildAdded } from 'firebase/database';

export const MSG_TYPES = {
  SOS: 'SOS',
  HELPER: 'HELPER',
  RESOURCE: 'RESOURCE',
};

class MeshNetwork {
  constructor() {
    this.myUserId = 'user_' + Math.random().toString(36).substr(2, 9);
    this.onMessageReceived = null;
    this.onPeerConnected = null;
    this.listeners = [];
  }

  async start() {
    console.log('Network started! My ID:', this.myUserId);
    this.listenForMessages();
    return this.myUserId;
  }

  listenForMessages() {
    const channels = [
      { path: 'sos_messages', type: MSG_TYPES.SOS },
      { path: 'helper_messages', type: MSG_TYPES.HELPER },
      { path: 'resource_messages', type: MSG_TYPES.RESOURCE },
    ];

    channels.forEach(({ path, type }) => {
      const unsubscribe = onChildAdded(ref(db, path), (snapshot) => {
        const data = snapshot.val();
        if (data && data.senderId !== this.myUserId) {
          if (this.onMessageReceived) {
            this.onMessageReceived({ ...data, type });
          }
          if (this.onPeerConnected) {
            this.onPeerConnected(data.senderId);
          }
        }
      });
      this.listeners.push(unsubscribe);
    });
  }

  async broadcast(data) {
    const { type, ...rest } = data;

    const payload = {
      ...rest,
      type,
      senderId: this.myUserId,
      timestamp: Date.now(),
    };

    switch (type) {
      case MSG_TYPES.SOS:
        await push(ref(db, 'sos_messages'), payload);
        break;
      case MSG_TYPES.HELPER:
        await push(ref(db, 'helper_messages'), payload);
        break;
      case MSG_TYPES.RESOURCE:
        await push(ref(db, 'resource_messages'), payload);
        break;
      default:
        console.warn('Unknown message type:', type);
    }

    return payload;
  }

  async stop() {
    this.listeners.forEach((unsub) => {
      if (typeof unsub === 'function') unsub();
    });
    this.listeners = [];
    this.onMessageReceived = null;
    this.onPeerConnected = null;
    console.log('Network stopped');
  }
}

export const mesh = new MeshNetwork();