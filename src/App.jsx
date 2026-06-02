import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./screens/Dashboard";
import Sidebar from "./components/Sidebar";
import AppBar from "./components/AppBar";
import Login from "./screens/Login";
import Layout from "./Layout";
import Profile from "./screens/Profile";
import Parametre from "./screens/Parametre";
import Register from "./screens/Register";

const App = () => {
  return (
    <div className="min-h-screen w-screen bg-gray-100">
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Parametre />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
