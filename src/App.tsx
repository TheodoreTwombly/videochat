import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Main } from './components/Main/Main';
import { Room } from './components/Room/Room';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/room/:id" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
