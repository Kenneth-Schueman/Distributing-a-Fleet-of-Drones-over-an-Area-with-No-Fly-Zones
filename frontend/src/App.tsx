// Library Imports
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';

// Container Imports
import Header from './components/header/Header';
import Nav from './components/nav/Nav';

// Page Imports
import Home from './pages/home/Home';
import Discover from './pages/discover/Discover';
import Plan from './pages/plan/Plan';
import Create_Targets from './pages/create-targets/Create_Targets';
import Operate from './pages/operate/Operate';
import Manage from './pages/manage/Manage';
import About from './pages/about/About'

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* <Header /> */}
        <div className="main-layout">
          <Nav />
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Home />} />
              {/* <Route path="/profile" element={< />} /> */}
              <Route path="/discover" element={<Discover />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/create-targets" element={<Create_Targets />} />
              <Route path="/operate" element={<Operate />} />
              <Route path="/manage" element={<Manage projects={[]} />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;