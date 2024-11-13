import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import socket from '../../socket';
import { SocketActions } from '../../constants/socket';

const CONFIG = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

export const Room = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [localUser, setLocalUser] = useState<string>('');
  //   const [remoteUser, setRemoteUser] = useState<string>('');

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const localMediaStream = useRef<MediaStream>();

  const localMediaRef = useRef<HTMLVideoElement>(null);
  const remoteMediaRef = useRef<HTMLVideoElement>(null);

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
        setLocalUser('LOCAL');
      } else {
        console.log('you blocked camera');
      }
    }
    startCapture().then(() => {
      console.log('join to WS');
      socket.emit(SocketActions.JOIN_ROOM, { roomId: id });
    });

    return () => {
      localMediaStream.current?.getTracks().forEach((track) => track.stop());
      console.log('LEAVE ROOM');
      socket.emit(SocketActions.LEAVE_ROOM, { roomId: id });
    };
  }, [id]);

  useEffect(() => {
    const localVideoElement = localMediaRef.current;
    if (localVideoElement && localMediaStream.current) {
      localVideoElement.srcObject = localMediaStream.current;
    } else {
      console.log('not found localVideoElement');
    }
  }, [localUser]);

  useEffect(() => {
    async function handleNewPeer({
      peerId,
      createOffer,
    }: {
      peerId: string;
      createOffer: boolean;
    }) {
      if (peerId in peerConnections.current) {
        return console.warn('Already connected to peer');
      }
      console.log('add peer', peerId);
      peerConnections.current[peerId] = new RTCPeerConnection(CONFIG);

      peerConnections.current[peerId].onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(SocketActions.SEND_ICE, {
            peerId,
            iceCandidate: event.candidate,
          });
        }
      };
      let trackNumber = 0;
      peerConnections.current[peerId].ontrack = ({
        streams: [remoteStream],
      }) => {
        trackNumber++;
        if (trackNumber === 2) {
          if (remoteMediaRef.current) {
            console.log('remoteStream', remoteStream);
            remoteMediaRef.current.srcObject = remoteStream;
          }
        }
      };

      if (localMediaStream.current) {
        localMediaStream.current.getTracks().forEach((track) => {
          if (localMediaStream.current) {
            peerConnections.current[peerId].addTrack(
              track,
              localMediaStream.current
            );
          }
        });
      }

      if (createOffer) {
        const offer = await peerConnections.current[peerId].createOffer();
        await peerConnections.current[peerId].setLocalDescription(offer);

        socket.emit(SocketActions.SEND_SDP, {
          peerId,
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
      peerId,
      sessionDescription,
    }: {
      peerId: string;
      sessionDescription: RTCSessionDescriptionInit;
    }) {
      console.log('setRemoteDescription peer', peerId);
      await peerConnections.current[peerId].setRemoteDescription(
        new RTCSessionDescription(sessionDescription)
      );

      if (sessionDescription.type === 'offer') {
        const answer = await peerConnections.current[peerId].createAnswer();

        console.log(
          'setRemoteDescription peerConnections',
          peerConnections.current
        );
        await peerConnections.current[peerId].setLocalDescription(answer);

        socket.emit(SocketActions.SEND_SDP, {
          peerId,
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
    socket.on(SocketActions.SET_ICE, ({ peerId, iceCandidate }) => {
      console.log('ice peer', peerId);
      console.log('ice candidate peerConnections', peerConnections.current);
      peerConnections.current[peerId].addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    });

    return () => {
      socket.off(SocketActions.SET_ICE);
    };
  }, []);

  useEffect(() => {
    const handleRemovePeer = ({ peerId }: { peerId: string }) => {
      console.log('someone leave ', peerId);
      if (peerConnections.current[peerId]) {
        peerConnections.current[peerId].close();
      }

      delete peerConnections.current[peerId];
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

  return (
    <div>
      <button onClick={exit}>Выход</button>
      <div>
        <video ref={localMediaRef} autoPlay playsInline muted={true} />
      </div>
      <div>
        <video ref={remoteMediaRef} autoPlay playsInline />
      </div>
    </div>
  );
};
