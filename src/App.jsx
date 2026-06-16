import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./screens/Dashboard";
import Login from "./screens/Login";
import Layout from "./Layout";
import Profile from "./screens/Profile";
import Parametre from "./screens/Parametre";
import Register from "./screens/Register";
import { AuthProvider } from "./context/AuthContext";
import { UsersProvider } from "./context/UsersContext";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <div className="bg-gray-100">
      <Toaster />
      <AuthProvider>
        <UsersProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Parametre />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </UsersProvider>
      </AuthProvider>
    </div>
  );
};

export default App;
