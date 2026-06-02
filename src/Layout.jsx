import React from "react";
import Sidebar from "./components/Sidebar";
import AppBar from "./components/AppBar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <AppBar />

      <main className="flex-1 mt-16 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
