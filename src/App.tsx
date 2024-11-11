import socket from './socket';
import './App.css';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    socket.on('connect', () => {
      console.log(socket.id);
    });
  }, []);
  return <div>Main</div>;
}

export default App;
