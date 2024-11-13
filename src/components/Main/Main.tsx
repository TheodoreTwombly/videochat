import { useEffect, useState } from 'react';
import socket from '../../socket';
import { useNavigate } from 'react-router-dom';
import { SocketActions } from '../../constants/socket';

import './Main.css';

export const Main = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    socket.on(SocketActions.CONNECT_ROOM, (roomId) => {
      navigate(`/room/${roomId}`, { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    socket.on(SocketActions.EXIST_ROOM, () => {
      setError('Такая комната уже существует');
    });
  }, []);

  useEffect(() => {
    socket.on(SocketActions.NOT_FOUND_ROOM, () => {
      setError('Комната не найдена');
    });
  }, []);

  useEffect(() => {
    socket.on(SocketActions.FULL_ROOM, () => {
      setError('Вы не можете присоедениться т.к. комната заполнена');
    });
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
    <div className="wrapper">
      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Type room id"
      />
      {error && <span>{error}</span>}

      <div className="controls">
        <button onClick={createRoom}>Create room</button>
        <button onClick={enterRoom}>Join room</button>
      </div>
    </div>
  );
};
