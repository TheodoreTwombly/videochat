import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import {
  Button,
  ClipboardButton,
  Icon,
  Label,
  TextInput,
} from '@gravity-ui/uikit';
import { ArrowRightFromSquare } from '@gravity-ui/icons';

import socket from '../../socket';
import { SocketActions } from '../../constants/socket';

import styles from './Room.module.css';

const CONFIG = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

export const Room = () => {
  const { id: roomId } = useParams();

  const navigate = useNavigate();

  const [hasLocalUser, setLocalUser] = useState(false);
  const [hasRemoteUser, setRemoteUser] = useState(false);

  const localMediaStream = useRef<MediaStream>();

  const localMediaRef = useRef<HTMLVideoElement>(null);
  const remoteMediaRef = useRef<HTMLVideoElement>(null);

  const peerConnection = useRef<RTCPeerConnection>();

  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        },
      });
      if (localMediaStream.current) {
        setLocalUser(true);
      } else {
        console.log('you blocked camera');
      }
    }
    startCapture().then(() => {
      socket.emit(SocketActions.JOIN_ROOM, { roomId });
    });

    return () => {
      localMediaStream.current?.getTracks().forEach((track) => track.stop());
      socket.emit(SocketActions.LEAVE_ROOM, { roomId });
    };
  }, [roomId]);

  useEffect(() => {
    const localVideoElement = localMediaRef.current;
    if (localVideoElement && localMediaStream.current) {
      localVideoElement.srcObject = localMediaStream.current;
    }
  }, [hasLocalUser]);

  useEffect(() => {
    async function handleNewPeer({
      remotePeerId,
      createOffer,
    }: {
      remotePeerId: string;
      createOffer: boolean;
    }) {
      if (peerConnection.current) {
        return console.warn('Already connected to peer');
      }
      peerConnection.current = new RTCPeerConnection(CONFIG);

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(SocketActions.SEND_ICE, {
            remotePeerId,
            iceCandidate: event.candidate,
          });
        }
      };
      let trackNumber = 0;
      peerConnection.current.ontrack = ({ streams: [remoteStream] }) => {
        trackNumber++;
        if (trackNumber === 2) {
          if (remoteMediaRef.current) {
            setRemoteUser(true);
            remoteMediaRef.current.srcObject = remoteStream;
          }
        }
      };

      if (localMediaStream.current) {
        localMediaStream.current.getTracks().forEach((track) => {
          if (localMediaStream.current && peerConnection.current) {
            peerConnection.current.addTrack(track, localMediaStream.current);
          }
        });
      }

      if (createOffer) {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        socket.emit(SocketActions.SEND_SDP, {
          remotePeerId,
          sessionDescription: offer,
        });
      }
    }
    socket.on(SocketActions.ADD_PEER, handleNewPeer);

    return () => {
      socket.off(SocketActions.ADD_PEER);
    };
  }, []);

  useEffect(() => {
    async function setRemoteDescription({
      remotePeerId,
      remoteSessionDescription,
    }: {
      remotePeerId: string;
      remoteSessionDescription: RTCSessionDescriptionInit;
    }) {
      if (!peerConnection.current) {
        return;
      }
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(remoteSessionDescription)
      );

      if (remoteSessionDescription.type === 'offer') {
        const answer = await peerConnection.current.createAnswer();

        await peerConnection.current.setLocalDescription(answer);

        socket.emit(SocketActions.SEND_SDP, {
          remotePeerId,
          sessionDescription: answer,
        });
      }
    }
    socket.on(SocketActions.SET_DESCRIPTION, setRemoteDescription);

    return () => {
      socket.off(SocketActions.SET_DESCRIPTION);
    };
  }, []);

  useEffect(() => {
    socket.on(SocketActions.SET_ICE, ({ iceCandidate }) => {
      if (peerConnection.current) {
        peerConnection.current.addIceCandidate(
          new RTCIceCandidate(iceCandidate)
        );
      }
    });

    return () => {
      socket.off(SocketActions.SET_ICE);
    };
  }, []);

  useEffect(() => {
    const handleRemovePeer = () => {
      setRemoteUser(false);
      if (!peerConnection.current) {
        return;
      }
      peerConnection.current.close();

      peerConnection.current = undefined;
      if (remoteMediaRef.current) {
        remoteMediaRef.current.srcObject = null;
      }
    };
    socket.on(SocketActions.REMOVE_PEER, handleRemovePeer);

    return () => {
      socket.off(SocketActions.REMOVE_PEER);
    };
  }, []);

  const exit = () => {
    navigate(`/`, { replace: false });
  };

  if (!roomId) {
    return;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.controlsWrapper}>
        <div className={styles.videosWrapper}>
          <video
            className={`${styles.localVideo} ${
              hasRemoteUser ? styles.halfHeight : styles.fullHeight
            }`}
            ref={localMediaRef}
            autoPlay
            playsInline
            muted={true}
          />
          <video
            className={`${styles.remoteVideo} ${
              hasRemoteUser ? styles.show : styles.hide
            }`}
            ref={remoteMediaRef}
            autoPlay
            playsInline
          />
        </div>
        <Button
          size="xl"
          className={styles.exitButton}
          onClick={exit}
          title={'Выход'}
          view="action"
        >
          <Icon data={ArrowRightFromSquare} size={18} />
        </Button>
      </div>
      <aside className={styles.chatWrapper}>
        <TextInput
          size="l"
          value={roomId}
          readOnly
          endContent={
            <ClipboardButton text={roomId} size="m" hasTooltip={false} />
          }
          startContent={<Label size="m">Идентификатор комнаты:</Label>}
          className={styles.roomNumberInput}
        />
      </aside>
    </div>
  );
};
