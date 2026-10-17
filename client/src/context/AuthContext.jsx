import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import axios from 'axios';

const API =
  'http://localhost:5000/api';

const AuthContext =
  createContext();

export function AuthProvider({
  children
}) {

  const [user,setUser] =
    useState(null);

  const [loading,setLoading] =
    useState(true);

  /* TOKEN */

  const token =
    localStorage.getItem(
      'ddas-token'
    );

  /* AXIOS */

  useEffect(()=>{

    if(token){

      axios.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${token}`;

    }

  },[token]);

  /* LOAD USER */

  const refreshUser =
    async()=>{

      const saved =
        localStorage.getItem(
          'ddas-user'
        );

      if(saved){

        try{

          setUser(
            JSON.parse(saved)
          );

        }catch(err){

          console.error(err);

        }

      }

      setLoading(false);

    };

  useEffect(()=>{

    refreshUser();

  },[]);

  /* LOGIN */

  const login =
    async(data)=>{

      const res =
        await axios.post(

          `${API}/auth/login`,
          data

        );

      const {

        token,
        user

      } = res.data;

      localStorage.setItem(
        'ddas-token',
        token
      );

      localStorage.setItem(
        'ddas-user',
        JSON.stringify(user)
      );

      axios.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${token}`;

      setUser(user);

      return user;

    };

  /* REGISTER */

  const register =
    async(data)=>{

      const res =
        await axios.post(

          `${API}/auth/register`,
          data

        );

      const {

        token,
        user

      } = res.data;

      localStorage.setItem(
        'ddas-token',
        token
      );

      localStorage.setItem(
        'ddas-user',
        JSON.stringify(user)
      );

      axios.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${token}`;

      setUser(user);

      return user;

    };

  /* LOGOUT */

  const logout =
    async()=>{

      localStorage.removeItem(
        'ddas-token'
      );

      localStorage.removeItem(
        'ddas-user'
      );

      delete axios.defaults.headers.common[
        'Authorization'
      ];

      setUser(null);

    };

  return(

    <AuthContext.Provider
      value={{

        user,

        loading,

        login,

        register,

        logout,

        refreshUser,

        setUser

      }}
    >

      {children}

    </AuthContext.Provider>

  );

}

export function useAuth(){

  return useContext(
    AuthContext
  );

}