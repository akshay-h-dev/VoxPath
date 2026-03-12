import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {

  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("voxpath_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const login = (newToken) => {
    localStorage.setItem("voxpath_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("voxpath_token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}