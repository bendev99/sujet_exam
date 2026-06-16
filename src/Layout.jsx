import React from "react";
import Sidebar from "./components/Sidebar";
import AppBar from "./components/AppBar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="flex min-h-screen max-w-screen">
      <Sidebar />
      <AppBar />

      <main className="flex-1 mt-16 ml-54 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
