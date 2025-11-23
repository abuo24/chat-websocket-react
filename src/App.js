import logo from './logo.svg';
import './App.css';
import StudentChat from './components/StudentChat';
import MentorChat from './components/MentorChat';

function App() {
  const userRole = localStorage.getItem('userRole'); // 'STUDENT' or 'MENTOR'
  
  return (
    userRole === 'STUDENT' ? <StudentChat /> : <MentorChat />
  );
}

export default App;
