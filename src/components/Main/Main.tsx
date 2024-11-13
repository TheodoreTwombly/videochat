import { useEffect, useState } from 'react';
import socket from '../../socket';
import { useNavigate } from 'react-router-dom';
import { SocketActions } from '../../constants/socket';
import { TextInput, Button } from '@gravity-ui/uikit';

import styles from './Main.module.css';

export const Main = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    socket.on(SocketActions.CONNECT_ROOM, (roomId) => {
      navigate(`/room/${roomId}`, { replace: true });
    });
    return () => {
      socket.off(SocketActions.CONNECT_ROOM);
    };
  }, [navigate]);

  useEffect(() => {
    socket.on(SocketActions.EXIST_ROOM, () => {
      setError('Такая комната уже существует');
    });
    socket.on(SocketActions.NOT_FOUND_ROOM, () => {
      setError('Комната не найдена');
    });
    socket.on(SocketActions.FULL_ROOM, () => {
      setError('Вы не можете присоедениться, т.к. комната заполнена');
    });
    return () => {
      socket.off(SocketActions.EXIST_ROOM);
      socket.off(SocketActions.NOT_FOUND_ROOM);
      socket.off(SocketActions.FULL_ROOM);
    };
  }, []);

  const createRoom = () => {
    if (!/^[a-zA-Z0-9]+$/.test(roomId)) {
      setError(
        'Идентификатор комнаты должен содержать только цифры или буквы латинского алфавита'
      );
    } else {
      socket.emit(SocketActions.CREATE_ROOM, { roomId });
    }
  };

  const enterRoom = () => {
    if (!/^[a-zA-Z0-9]+$/.test(roomId)) {
      setError(
        'Идентификатор комнаты должен содержать только цифры или буквы латинского алфавита'
      );
    } else {
      socket.emit(SocketActions.ENTER_ROOM, { roomId });
    }
  };

  return (
    <div className={styles.wrapper}>
      <TextInput
        size="xl"
        placeholder="Введите идентификатор комнаты"
        onChange={(e) => setRoomId(e.target.value)}
        errorMessage={error}
        validationState={error ? 'invalid' : undefined}
        onKeyDown={() => setError('')}
      />
      <div className={styles.controls}>
        <Button view="action" size="l" onClick={createRoom}>
          Создать
        </Button>
        <Button view="normal" size="l" onClick={enterRoom}>
          Войти
        </Button>
      </div>
    </div>
  );
};
