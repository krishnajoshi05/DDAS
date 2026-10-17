import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

const ThemeContext =
  createContext();

export function ThemeProvider({
  children
}) {

  /* INITIAL THEME */

  const getInitialTheme =
    () => {

      const saved =
        localStorage.getItem(
          'ddas-theme'
        );

      return saved
        ? saved === 'dark'
        : true;

    };

  const [darkMode,setDarkMode] =
    useState(getInitialTheme);

  /* APPLY THEME */

  useEffect(()=>{

    const root =
      document.documentElement;

    if(darkMode){

      /* DARK MODE */

      root.classList.add('dark');

      root.style.setProperty(
        '--bg',
        '#050816'
      );

      root.style.setProperty(
        '--bg-secondary',
        '#0b1120'
      );

      root.style.setProperty(
        '--card',
        'rgba(10,15,35,0.72)'
      );

      root.style.setProperty(
        '--card-solid',
        '#111827'
      );

      root.style.setProperty(
        '--border',
        'rgba(255,255,255,0.08)'
      );

      root.style.setProperty(
        '--text',
        '#f8fafc'
      );

      root.style.setProperty(
        '--soft-text',
        '#94a3b8'
      );

      root.style.setProperty(
        '--primary',
        '#8b5cf6'
      );

      root.style.setProperty(
        '--secondary',
        '#06b6d4'
      );

    }else{

      /* LIGHT MODE */

      root.classList.remove('dark');

      root.style.setProperty(
        '--bg',
        '#eef2ff'
      );

      root.style.setProperty(
        '--bg-secondary',
        '#ffffff'
      );

      root.style.setProperty(
        '--card',
        'rgba(255,255,255,0.75)'
      );

      root.style.setProperty(
        '--card-solid',
        '#ffffff'
      );

      root.style.setProperty(
        '--border',
        'rgba(15,23,42,0.08)'
      );

      root.style.setProperty(
        '--text',
        '#0f172a'
      );

      root.style.setProperty(
        '--soft-text',
        '#475569'
      );

      root.style.setProperty(
        '--primary',
        '#7c3aed'
      );

      root.style.setProperty(
        '--secondary',
        '#0891b2'
      );

    }

    localStorage.setItem(
      'ddas-theme',
      darkMode
        ? 'dark'
        : 'light'
    );

  },[darkMode]);

  /* TOGGLE */

  const toggleTheme =
    ()=>{

      setDarkMode(
        prev => !prev
      );

    };

  return(

    <ThemeContext.Provider
      value={{

        darkMode,

        toggleTheme

      }}
    >

      {children}

    </ThemeContext.Provider>

  );

}

export function useTheme(){

  return useContext(
    ThemeContext
  );

}