import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { TextInput } from '@gravity-ui/uikit';

import styles from './Chat.module.css';
import socket from '../../socket';
import { SocketActions } from '../../constants/socket';

interface ChatProps {
  hasRemoteUser: boolean;
  roomId: string;
}
interface Message {
  isLocal: boolean;
  message: string;
}
export const Chat: FC<ChatProps> = ({ hasRemoteUser, roomId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [localMessage, setLocalMessage] = useState('');

  const scrollToRef = useRef<HTMLDivElement>(null);

  const scrollToLastMessage = useCallback(() => {
    scrollToRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  useEffect(() => {
    socket.on(SocketActions.SEND_MESSAGE, (message: Message) => {
      setMessages((messages) => {
        return [...messages, message];
      });
      scrollToLastMessage();
    });

    return () => {
      socket.off(SocketActions.SEND_MESSAGE);
    };
  }, [scrollToLastMessage]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.preview}>
        {messages.map((message, index) => {
          return (
            <div
              key={index}
              className={`${styles.rowMessage} ${
                message.isLocal
                  ? styles.rowLocalMessage
                  : styles.rowRemoteMessage
              }`}
            >
              <span
                className={`${styles.message} ${
                  message.isLocal ? styles.localMessage : styles.remoteMessage
                }`}
              >
                {message.message}
              </span>
            </div>
          );
        })}
        <div ref={scrollToRef}></div>
      </div>
      <div className={styles.messageInput}>
        <TextInput
          disabled={!hasRemoteUser}
          value={localMessage}
          placeholder="Введите сообщение"
          onChange={(e) => {
            setLocalMessage(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!localMessage) {
                return;
              }
              socket.emit(SocketActions.SEND_MESSAGE, {
                roomId,
                isLocal: false,
                message: localMessage,
              });
              setMessages((messages) => {
                return [...messages, { isLocal: true, message: localMessage }];
              });
              setLocalMessage('');
              scrollToLastMessage();
            }
          }}
        />
      </div>
    </div>
  );
};
