"use client";

import { createContext, useContext } from "react";

interface User {
  _id: string;
  username: string;
  fullName: string;
  role: "admin" | "operator";
}

const UserContext = createContext<User | null>(null);

export function UserProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
